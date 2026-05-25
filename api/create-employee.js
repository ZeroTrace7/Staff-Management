const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://xmkqznceprpvibovzcnf.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function send(res, status, payload) {
  res.status(status).json(payload);
}

function cleanEmail(value) {
  return String(value || '').trim().toLowerCase();
}

async function findAuthUserByEmail(adminClient, email) {
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await adminClient.auth.admin.listUsers({
      page,
      perPage: 100
    });
    if (error) throw error;

    const match = data.users.find((user) => cleanEmail(user.email) === email);
    if (match) return match;
    if (data.users.length < 100) break;
  }
  return null;
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return send(res, 204, {});
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return send(res, 405, { error: 'Method not allowed.' });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return send(res, 500, {
      error: 'Employee creation is not configured on the server.'
    });
  }

  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) {
    return send(res, 401, { error: 'Please sign in again.' });
  }

  const employeeEmail = cleanEmail(req.body?.email);
  const employeePassword = String(req.body?.password || '');
  const employeeName = String(req.body?.name || '').trim();

  if (!employeeName || !employeeEmail || !employeePassword) {
    return send(res, 400, { error: 'Name, email, and password are required.' });
  }

  if (employeePassword.length < 6) {
    return send(res, 400, { error: 'Temporary password must be at least 6 characters.' });
  }

  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  const { data: authUser, error: authUserError } = await adminClient.auth.getUser(token);
  if (authUserError || !authUser?.user) {
    const message = String(authUserError?.message || '');
    if (message.toLowerCase().includes('api key')) {
      return send(res, 500, { error: 'Employee creation is not configured correctly on the server.' });
    }
    return send(res, 401, { error: 'Your session expired. Sign out and sign in again.' });
  }

  const { data: adminProfile, error: adminProfileError } = await adminClient
    .from('users')
    .select('id, company_id, role')
    .eq('id', authUser.user.id)
    .single();

  if (adminProfileError || !adminProfile || adminProfile.role !== 'admin') {
    return send(res, 403, { error: 'Only owners can add employees.' });
  }

  let createdUser = null;
  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email: employeeEmail,
    password: employeePassword,
    email_confirm: true,
    user_metadata: {
      name: employeeName,
      role: 'employee',
      company_id: adminProfile.company_id
    }
  });

  if (createError || !created?.user) {
    const message = String(createError?.message || 'Employee account could not be created.');
    if (message.toLowerCase().includes('already')) {
      createdUser = await findAuthUserByEmail(adminClient, employeeEmail);
      if (!createdUser) {
        return send(res, 409, { error: 'An employee with this email already exists.' });
      }
      const { error: updateExistingError } = await adminClient.auth.admin.updateUserById(createdUser.id, {
        password: employeePassword,
        email_confirm: true,
        user_metadata: {
          name: employeeName,
          role: 'employee',
          company_id: adminProfile.company_id
        }
      });
      if (updateExistingError) {
        return send(res, 400, { error: updateExistingError.message });
      }
    } else {
      return send(res, 400, { error: message });
    }
  } else {
    createdUser = created.user;
  }

  const { data: existingProfile, error: existingProfileError } = await adminClient
    .from('users')
    .select('*')
    .eq('email', employeeEmail)
    .maybeSingle();

  if (existingProfileError) {
    return send(res, 400, { error: existingProfileError.message });
  }

  if (existingProfile) {
    return send(res, 409, { error: 'An employee with this email already exists.' });
  }

  const { data: profile, error: profileError } = await adminClient
    .from('users')
    .insert({
      id: createdUser.id,
      company_id: adminProfile.company_id,
      name: employeeName,
      email: employeeEmail,
      role: 'employee'
    })
    .select()
    .single();

  if (profileError) {
    if (created?.user?.id) {
      await adminClient.auth.admin.deleteUser(created.user.id).catch(() => {});
    }
    const message = String(profileError.message || 'Employee profile could not be created.');
    if (message.toLowerCase().includes('duplicate')) {
      return send(res, 409, { error: 'An employee with this email already exists.' });
    }
    return send(res, 400, { error: message });
  }

  return send(res, 200, {
    success: true,
    employee: profile,
    needsConfirmation: false
  });
};
