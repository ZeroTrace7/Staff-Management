/**
 * Payroll Module — js/payroll.js
 * Phase 1: Salary config + working hours calculation from attendance_logs.
 * Phase 2: Monthly payroll generation (full CTC minus deductions model).
 * Phase 3: Salary slip HTML + print.
 */

const Payroll = {

  // ─── HELPERS ────────────────────────────────────────────────────────────────

  _requireClient() {
    if (!window.staffSupabaseClient) {
      throw new Error('Backend connection is unavailable.');
    }
    return window.staffSupabaseClient;
  },

  /**
   * Count weekdays (Mon–Fri) in a given month/year.
   * Used when daily_rate_method = 'actual'.
   */
  _countWeekdaysInMonth(month, year) {
    let count = 0;
    const daysInMonth = new Date(year, month, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const day = new Date(year, month - 1, d).getDay();
      if (day !== 0 && day !== 6) count++;
    }
    return count;
  },

  /**
   * Get base days for daily rate calculation.
   */
  _getBaseDays(method, month, year) {
    if (method === '30_day') return 30;
    if (method === 'actual') return this._countWeekdaysInMonth(month, year);
    return 26; // default '26_day'
  },

  /**
   * Format currency for display.
   */
  formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  },

  // ─── SALARY CONFIG CRUD ─────────────────────────────────────────────────────

  /**
   * Get the active salary config for an employee.
   */
  async getSalaryConfig(userId) {
    try {
      const client = this._requireClient();
      const { data, error } = await client
        .from('salary_configs')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .is('effective_to', null)
        .maybeSingle();

      if (error) {
        console.error('[Payroll] getSalaryConfig error:', error.message);
        return null;
      }
      return data;
    } catch (err) {
      console.error('[Payroll] getSalaryConfig error:', err.message);
      return null;
    }
  },

  /**
   * Save or update salary config for an employee.
   * Deactivates any existing active config before creating the new one.
   */
  async saveSalaryConfig(userId, companyId, config) {
    try {
      const client = this._requireClient();
      const today = new Date().toISOString().split('T')[0];

      const existing = await this.getSalaryConfig(userId);
      if (existing) {
        if (existing.effective_from === today) {
          // FIX: Same-day edit — update in place (not delete).
          // Deletion would break FK from payroll_runs.salary_config_id.
          const { data, error } = await client
            .from('salary_configs')
            .update({
              monthly_ctc: config.monthly_ctc,
              basic_pct: config.basic_pct || 50,
              hra_pct: config.hra_pct || 20,
              bank_account: config.bank_account || null,
              bank_ifsc: config.bank_ifsc || null,
              pan: config.pan || null,
              uan: config.uan || null,
              updated_at: new Date().toISOString()
            })
            .eq('id', existing.id)
            .select()
            .single();

          if (error) throw error;
          console.log('[Payroll] Salary config updated in-place for user:', userId);
          return { success: true, config: data };
        } else {
          // Different day: deactivate old, create new
          const { error: deactivateError } = await client
            .from('salary_configs')
            .update({
              is_active: false,
              effective_to: today,
              updated_at: new Date().toISOString()
            })
            .eq('id', existing.id);
          if (deactivateError) {
            console.error('[Payroll] deactivate old config error:', deactivateError.message);
            throw deactivateError;
          }
        }
      }

      // Insert new active config (only reached if no existing or existing was deactivated)
      const { data, error } = await client
        .from('salary_configs')
        .insert({
          user_id: userId,
          company_id: companyId,
          monthly_ctc: config.monthly_ctc,
          basic_pct: config.basic_pct || 50,
          hra_pct: config.hra_pct || 20,
          bank_account: config.bank_account || null,
          bank_ifsc: config.bank_ifsc || null,
          pan: config.pan || null,
          uan: config.uan || null,
          effective_from: today,
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;

      console.log('[Payroll] Salary config saved for user:', userId);
      return { success: true, config: data };
    } catch (err) {
      console.error('[Payroll] saveSalaryConfig error:', err.message);
      return { success: false, error: err.message };
    }
  },

  /**
   * Get all salary configs for a company (for payroll generation).
   */
  async getCompanySalaryConfigs(companyId) {
    try {
      const client = this._requireClient();
      const { data, error } = await client
        .from('salary_configs')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .is('effective_to', null);

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('[Payroll] getCompanySalaryConfigs error:', err.message);
      return [];
    }
  },

  // ─── COMPANY PAYROLL SETTINGS ───────────────────────────────────────────────

  /**
   * Save payroll-specific settings to the companies table.
   */
  async savePayrollSettings(companyId, settings) {
    try {
      const client = this._requireClient();
      const { data, error } = await client
        .from('companies')
        .update({
          daily_rate_method: settings.daily_rate_method || '26_day',
          work_hours_per_day: settings.work_hours_per_day || 8,
          late_grace_minutes: settings.late_grace_minutes || 15,
          late_marks_per_half_day: settings.late_marks_per_half_day || 3,
          overtime_multiplier: settings.overtime_multiplier || 2.0
        })
        .eq('id', companyId)
        .select()
        .single();

      if (error) throw error;

      console.log('[Payroll] Payroll settings saved for company:', companyId);
      return { success: true, company: data };
    } catch (err) {
      console.error('[Payroll] savePayrollSettings error:', err.message);
      return { success: false, error: err.message };
    }
  },

  // ─── WORKING HOURS CALCULATION ──────────────────────────────────────────────

  /**
   * Calculate working hours from attendance_logs for a specific user and month.
   * Returns an object with per-day breakdown and monthly totals.
   */
  async calculateWorkingHours(userId, companyId, month, year, company) {
    try {
      const client = this._requireClient();

      // FIX #6: Use IST-aware month boundaries.
      // India is UTC+5:30, so the 1st of the month in IST starts at
      // previous day 18:30 UTC. We query a wider UTC range and group by IST date.
      const istOffsetMs = 5.5 * 60 * 60 * 1000;
      const startDate = new Date(Date.UTC(year, month - 1, 1) - istOffsetMs);
      const endDate = new Date(Date.UTC(year, month, 1) - istOffsetMs + 24 * 60 * 60 * 1000);

      const { data: logs, error } = await client
        .from('attendance_logs')
        .select('*')
        .eq('user_id', userId)
        .eq('company_id', companyId)
        .gte('timestamp', startDate.toISOString())
        .lt('timestamp', endDate.toISOString())
        .order('timestamp', { ascending: true });

      if (error) throw error;

      // Company settings
      const workHoursPerDay = Number(company?.work_hours_per_day) || 8;
      const graceMinutes = Number(company?.late_grace_minutes) || 15;
      const workStartTime = company?.work_start_time || '09:00';
      const [startH, startM] = workStartTime.split(':').map(Number);
      const workStartMinutes = (startH || 0) * 60 + (startM || 0);

      // FIX #6: Group logs by IST date to avoid boundary issues.
      const dayMap = {};
      for (const log of (logs || [])) {
        const istTime = new Date(new Date(log.timestamp).getTime() + istOffsetMs);
        const dayKey = `${istTime.getUTCFullYear()}-${String(istTime.getUTCMonth() + 1).padStart(2, '0')}-${String(istTime.getUTCDate()).padStart(2, '0')}`;
        // Only include days that belong to the target month
        if (istTime.getUTCMonth() + 1 !== month || istTime.getUTCFullYear() !== year) continue;
        if (!dayMap[dayKey]) dayMap[dayKey] = [];
        dayMap[dayKey].push(log);
      }

      let daysPresent = 0;
      let halfDays = 0;
      let daysAbsent = 0;
      let lateMarks = 0;
      let totalOvertimeHours = 0;
      let totalHoursWorked = 0;
      const dailyBreakdown = [];

      // Process each day in the month
      const daysInMonth = new Date(year, month, 0).getDate();
      for (let d = 1; d <= daysInMonth; d++) {
        const dayOfWeek = new Date(year, month - 1, d).getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const dayKey = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const dayLogs = dayMap[dayKey] || [];

        // Skip weekends for attendance tracking (they're not working days)
        if (isWeekend && dayLogs.length === 0) continue;

        // FIX #6: Pair clock_in / clock_out by consuming each clock_out once.
        let hoursWorked = 0;
        let isLate = false;
        const clockIns = dayLogs.filter(l => l.type === 'clock_in');
        const clockOuts = dayLogs.filter(l => l.type === 'clock_out');
        const usedClockOutIds = new Set();

        for (let i = 0; i < clockIns.length; i++) {
          const cin = new Date(clockIns[i].timestamp);
          // Find the earliest unused clock_out after this clock_in
          const cout = clockOuts.find(co =>
            new Date(co.timestamp) > cin && !usedClockOutIds.has(co.id)
          );
          if (cout) {
            usedClockOutIds.add(cout.id);
            hoursWorked += (new Date(cout.timestamp) - cin) / (1000 * 60 * 60);
          }
          // If no matching clock_out, don't count (still clocked in)
        }

        // Check late (first clock_in of the day, using IST time)
        if (clockIns.length > 0) {
          const firstCinIST = new Date(new Date(clockIns[0].timestamp).getTime() + istOffsetMs);
          const actualMinutes = firstCinIST.getUTCHours() * 60 + firstCinIST.getUTCMinutes();
          if (actualMinutes > workStartMinutes + graceMinutes) {
            isLate = true;
            lateMarks++;
          }
        }

        // Determine day status
        let status = 'absent';
        if (hoursWorked >= workHoursPerDay) {
          status = 'full';
          daysPresent++;
        } else if (hoursWorked >= workHoursPerDay / 2) {
          status = 'half';
          halfDays++;
        } else if (dayLogs.length > 0 && hoursWorked > 0) {
          status = 'half';
          halfDays++;
        } else if (!isWeekend) {
          // Only count past weekdays as absent
          const today = new Date();
          const checkDate = new Date(year, month - 1, d);
          if (checkDate < today) {
            daysAbsent++;
          }
        }

        // Overtime (only on full days)
        let overtimeHrs = 0;
        if (status === 'full' && hoursWorked > workHoursPerDay) {
          overtimeHrs = hoursWorked - workHoursPerDay;
          totalOvertimeHours += overtimeHrs;
        }

        totalHoursWorked += hoursWorked;

        dailyBreakdown.push({
          date: dayKey,
          dayOfWeek,
          hoursWorked: Math.round(hoursWorked * 100) / 100,
          status,
          isLate,
          overtimeHours: Math.round(overtimeHrs * 100) / 100
        });
      }

      return {
        userId,
        month,
        year,
        daysPresent,
        halfDays,
        daysAbsent,
        lateMarks,
        overtimeHours: Math.round(totalOvertimeHours * 100) / 100,
        totalHoursWorked: Math.round(totalHoursWorked * 100) / 100,
        dailyBreakdown
      };
    } catch (err) {
      console.error('[Payroll] calculateWorkingHours error:', err.message);
      return {
        userId, month, year,
        daysPresent: 0, halfDays: 0, daysAbsent: 0,
        lateMarks: 0, overtimeHours: 0, totalHoursWorked: 0,
        dailyBreakdown: []
      };
    }
  },

  /**
   * Calculate today's worked hours for a single user (for dashboard display).
   * Returns hours as a number.
   */
  calculateTodayHours(todayLogs) {
    if (!todayLogs || todayLogs.length === 0) return 0;

    const clockIns = todayLogs.filter(l => l.type === 'clock_in');
    const clockOuts = todayLogs.filter(l => l.type === 'clock_out');
    let hours = 0;

    for (let i = 0; i < clockIns.length; i++) {
      const cin = new Date(clockIns[i].timestamp);
      const cout = clockOuts.find(co => new Date(co.timestamp) > cin);
      if (cout) {
        hours += (new Date(cout.timestamp) - cin) / (1000 * 60 * 60);
      } else {
        // Currently clocked in — count time until now
        hours += (Date.now() - cin.getTime()) / (1000 * 60 * 60);
      }
    }

    return Math.round(hours * 100) / 100;
  },

  /**
   * Format hours for display: "6h 32m" or "0h 0m".
   */
  formatHours(decimalHours) {
    if (!decimalHours || decimalHours <= 0) return '0h 0m';
    const h = Math.floor(decimalHours);
    const m = Math.round((decimalHours - h) * 60);
    return `${h}h ${m}m`;
  },

  // ─── PHASE 2: PAYROLL GENERATION ENGINE ─────────────────────────────────────

  /**
   * Generate monthly payroll for all employees with salary configs.
   * Uses the corrected Full-CTC-minus-deductions model (no double deduction).
   */
  async generateMonthlyPayroll(companyId, month, year) {
    try {
      const client = this._requireClient();

      // 1. Get company settings
      const { data: company, error: companyErr } = await client
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .single();
      if (companyErr) throw companyErr;

      // 2. Get all active salary configs
      const salaryConfigs = await this.getCompanySalaryConfigs(companyId);
      if (!salaryConfigs.length) {
        return { success: false, error: 'No salary configurations found. Set up salary for employees first.' };
      }

      // 3. Get employee names for display
      const { data: users } = await client
        .from('users')
        .select('id, name, email')
        .eq('company_id', companyId)
        .eq('is_active', true);
      const userMap = {};
      for (const u of (users || [])) userMap[u.id] = u;

      // 4. Get existing adjustments for this month
      const { data: adjustments } = await client
        .from('salary_adjustments')
        .select('*')
        .eq('company_id', companyId)
        .eq('pay_month', month)
        .eq('pay_year', year);
      const adjByUser = {};
      for (const adj of (adjustments || [])) {
        if (!adjByUser[adj.user_id]) adjByUser[adj.user_id] = [];
        adjByUser[adj.user_id].push(adj);
      }

      const results = [];
      const errors = [];

      // 5. Process each employee with salary config
      for (const config of salaryConfigs) {
        try {
          // Calculate working hours from attendance_logs
          const attendance = await this.calculateWorkingHours(
            config.user_id, companyId, month, year, company
          );

          // Company settings snapshot
          const method = company.daily_rate_method || '26_day';
          const workHours = Number(company.work_hours_per_day) || 8;
          const otMultiplier = Number(company.overtime_multiplier) || 2.0;
          const latePerHalfDay = Number(company.late_marks_per_half_day) || 3;

          // Base days
          const baseDays = this._getBaseDays(method, month, year);
          const dailyRate = Number(config.monthly_ctc) / baseDays;

          // Step 1: Full CTC components
          const ctc = Number(config.monthly_ctc);
          const basicFull = ctc * Number(config.basic_pct) / 100;
          const hraFull = ctc * Number(config.hra_pct) / 100;
          const specialFull = ctc - basicFull - hraFull;

          // Step 2: Late deduction days
          const lateDeductionDays = Math.floor(attendance.lateMarks / latePerHalfDay) * 0.5;

          // Step 3: Deductions (from full CTC)
          const lopDeduction = attendance.daysAbsent * dailyRate;
          const halfDayDeduction = attendance.halfDays * 0.5 * dailyRate;
          const lateDeduction = lateDeductionDays * dailyRate;

          // Step 4: Overtime
          const hourlyRate = dailyRate / workHours;
          const overtimePay = attendance.overtimeHours * hourlyRate * otMultiplier;

          // Step 5: Adjustments
          const userAdj = adjByUser[config.user_id] || [];
          let bonusTotal = 0;
          let otherDeductions = 0;
          for (const adj of userAdj) {
            if (adj.amount > 0) bonusTotal += Number(adj.amount);
            else otherDeductions += Math.abs(Number(adj.amount));
          }

          // Step 6: Totals
          // FIX #3: overtime is already in grossFull, so total_additions = bonusTotal only
          const grossFull = basicFull + hraFull + specialFull + overtimePay;
          const totalDeductions = lopDeduction + halfDayDeduction + lateDeduction + otherDeductions;
          const totalAdditions = bonusTotal; // NOT overtimePay — it's already in grossFull
          const netPay = grossFull - totalDeductions + bonusTotal;

          // Round all values
          const round = v => Math.round(v * 100) / 100;

          const payrollRow = {
            user_id: config.user_id,
            company_id: companyId,
            pay_month: month,
            pay_year: year,
            // Snapshot
            salary_config_id: config.id,
            snapshot_monthly_ctc: ctc,
            snapshot_basic_pct: Number(config.basic_pct),
            snapshot_hra_pct: Number(config.hra_pct),
            snapshot_daily_rate_method: method,
            snapshot_work_hours_per_day: workHours,
            snapshot_overtime_multiplier: otMultiplier,
            // Attendance
            base_days: baseDays,
            days_present: attendance.daysPresent,
            half_days: attendance.halfDays,
            days_absent: attendance.daysAbsent,
            late_marks: attendance.lateMarks,
            late_deduction_days: lateDeductionDays,
            overtime_hours: attendance.overtimeHours,
            // Earnings
            basic_full: round(basicFull),
            hra_full: round(hraFull),
            special_full: round(specialFull),
            overtime_pay: round(overtimePay),
            gross_full: round(grossFull),
            // Deductions
            lop_deduction: round(lopDeduction),
            half_day_deduction: round(halfDayDeduction),
            late_deduction: round(lateDeduction),
            other_deductions: round(otherDeductions),
            total_deductions: round(totalDeductions),
            // Additions
            bonus: round(bonusTotal),
            total_additions: round(totalAdditions),
            // Net
            net_pay: round(netPay),
            status: 'draft'
          };

          // Upsert — if a draft already exists for this employee+month, replace it
          const { data: existing } = await client
            .from('payroll_runs')
            .select('id, status')
            .eq('user_id', config.user_id)
            .eq('pay_month', month)
            .eq('pay_year', year)
            .maybeSingle();

          if (existing) {
            if (existing.status !== 'draft') {
              errors.push(`${userMap[config.user_id]?.name || config.user_id}: Payroll already confirmed/paid — skipped.`);
              continue;
            }
            // Update existing draft
            const { error: updateErr } = await client
              .from('payroll_runs')
              .update(payrollRow)
              .eq('id', existing.id);
            if (updateErr) throw updateErr;
            payrollRow.id = existing.id;
          } else {
            // Insert new
            const { data: inserted, error: insertErr } = await client
              .from('payroll_runs')
              .insert(payrollRow)
              .select()
              .single();
            if (insertErr) throw insertErr;
            payrollRow.id = inserted.id;
          }

          results.push({
            ...payrollRow,
            employeeName: userMap[config.user_id]?.name || 'Unknown',
            employeeEmail: userMap[config.user_id]?.email || ''
          });
        } catch (empErr) {
          errors.push(`${userMap[config.user_id]?.name || config.user_id}: ${empErr.message}`);
        }
      }

      console.log(`[Payroll] Generated ${results.length} payroll runs for ${month}/${year}`);
      return { success: true, runs: results, errors };
    } catch (err) {
      console.error('[Payroll] generateMonthlyPayroll error:', err.message);
      return { success: false, error: err.message };
    }
  },

  /**
   * Get payroll summary for a company + month (for display).
   */
  async getPayrollSummary(companyId, month, year) {
    try {
      const client = this._requireClient();

      const { data: runs, error } = await client
        .from('payroll_runs')
        .select('*')
        .eq('company_id', companyId)
        .eq('pay_month', month)
        .eq('pay_year', year)
        .order('created_at', { ascending: true });

      if (error) throw error;
      if (!runs || !runs.length) return { runs: [], users: {} };

      // Get user details
      const userIds = runs.map(r => r.user_id);
      const { data: users } = await client
        .from('users')
        .select('id, name, email')
        .in('id', userIds);

      const userMap = {};
      for (const u of (users || [])) userMap[u.id] = u;

      return { runs, users: userMap };
    } catch (err) {
      console.error('[Payroll] getPayrollSummary error:', err.message);
      return { runs: [], users: {} };
    }
  },

  /**
   * Confirm a payroll run — calls SECURITY DEFINER RPC to bypass RLS.
   * FIX #1: Direct UPDATE would fail because WITH CHECK requires status='draft'
   * on the new row, but the new row has status='confirmed'.
   */
  async confirmPayroll(companyId, month, year) {
    try {
      const client = this._requireClient();

      const { data, error } = await client
        .rpc('confirm_payroll', {
          p_company_id: companyId,
          p_pay_month: month,
          p_pay_year: year
        });

      if (error) throw error;

      const confirmed = data || 0;
      console.log(`[Payroll] Confirmed ${confirmed} payroll runs for ${month}/${year}`);
      return { success: true, confirmed };
    } catch (err) {
      console.error('[Payroll] confirmPayroll error:', err.message);
      return { success: false, error: err.message };
    }
  },

  /**
   * Add a salary adjustment (bonus, fine, advance recovery, etc.).
   */
  async addAdjustment(userId, companyId, type, amount, description, month, year) {
    try {
      const client = this._requireClient();

      // Ensure amount sign matches type
      let finalAmount = Math.abs(Number(amount));
      if (['advance_recovery', 'fine', 'other_deduction'].includes(type)) {
        finalAmount = -finalAmount;
      }

      const { data, error } = await client
        .from('salary_adjustments')
        .insert({
          user_id: userId,
          company_id: companyId,
          type,
          amount: finalAmount,
          description: description || null,
          pay_month: month,
          pay_year: year
        })
        .select()
        .single();

      if (error) throw error;

      console.log(`[Payroll] Adjustment added: ${type} ${finalAmount} for user ${userId}`);
      return { success: true, adjustment: data };
    } catch (err) {
      console.error('[Payroll] addAdjustment error:', err.message);
      return { success: false, error: err.message };
    }
  },

  /**
   * Delete a draft payroll run (only works on draft status due to RLS).
   */
  async deletePayrollRun(runId) {
    try {
      const client = this._requireClient();
      const { error } = await client
        .from('payroll_runs')
        .delete()
        .eq('id', runId);

      if (error) throw error;
      return { success: true };
    } catch (err) {
      console.error('[Payroll] deletePayrollRun error:', err.message);
      return { success: false, error: err.message };
    }
  },

  /**
   * Get adjustments for a specific employee + month.
   */
  async getAdjustments(userId, companyId, month, year) {
    try {
      const client = this._requireClient();
      const { data, error } = await client
        .from('salary_adjustments')
        .select('*')
        .eq('user_id', userId)
        .eq('company_id', companyId)
        .eq('pay_month', month)
        .eq('pay_year', year);

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('[Payroll] getAdjustments error:', err.message);
      return [];
    }
  },

  // ─── PHASE 3: SALARY SLIP GENERATION ────────────────────────────────────────

  /**
   * Build salary slip HTML from a payroll_run row + metadata.
   * Uses only snapshot data from the run — never queries live salary_configs.
   */
  buildSlipHTML(run, employeeName, employeeEmail, companyName) {
    const fc = this.formatCurrency;
    const _months = ['', 'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    const month = _months[run.pay_month] || run.pay_month;
    const year = run.pay_year;
    const statusLabel = run.status === 'draft' ? 'DRAFT' : (run.status === 'confirmed' ? 'CONFIRMED' : 'PAID');
    const statusColor = run.status === 'draft' ? '#F59E0B' : '#22C55E';
    const specialPct = 100 - Number(run.snapshot_basic_pct) - Number(run.snapshot_hra_pct);

    return `
    <div class="salary-slip" style="max-width: 640px; margin: 0 auto; font-family: 'Inter', sans-serif; color: #1F2937; background: white; padding: 32px; border-radius: 16px;">
      <!-- Header -->
      <div style="border-bottom: 2px solid #E5E7EB; padding-bottom: 16px; margin-bottom: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: start;">
          <div>
            <div style="font-size: 1.4rem; font-weight: 700; color: #111827;">${companyName || 'Company'}</div>
            <div style="font-size: 0.85rem; color: #6B7280; margin-top: 4px;">Salary Slip — ${month} ${year}</div>
          </div>
          <div style="font-size: 0.75rem; font-weight: 600; color: ${statusColor}; background: ${statusColor}15; padding: 4px 12px; border-radius: 6px;">${statusLabel}</div>
        </div>
      </div>

      <!-- Employee Info -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 0.85rem; margin-bottom: 20px; padding: 12px; background: #F9FAFB; border-radius: 8px;">
        <div><span style="color: #6B7280;">Employee:</span> <strong>${employeeName}</strong></div>
        <div><span style="color: #6B7280;">Email:</span> ${employeeEmail}</div>
        <div><span style="color: #6B7280;">Monthly CTC:</span> ${fc(run.snapshot_monthly_ctc)}</div>
        <div><span style="color: #6B7280;">Rate Method:</span> ${run.snapshot_daily_rate_method}</div>
      </div>

      <!-- Attendance Summary -->
      <div style="margin-bottom: 20px;">
        <div style="font-weight: 600; font-size: 0.9rem; margin-bottom: 8px; color: #374151;">Attendance Summary</div>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; font-size: 0.8rem;">
          <div style="background: #ECFDF5; padding: 8px; border-radius: 6px; text-align: center;">
            <div style="font-weight: 600; color: #065F46;">${run.days_present}</div>
            <div style="color: #6B7280;">Present</div>
          </div>
          <div style="background: #FEF3C7; padding: 8px; border-radius: 6px; text-align: center;">
            <div style="font-weight: 600; color: #92400E;">${run.half_days}</div>
            <div style="color: #6B7280;">Half Days</div>
          </div>
          <div style="background: #FEE2E2; padding: 8px; border-radius: 6px; text-align: center;">
            <div style="font-weight: 600; color: #991B1B;">${run.days_absent}</div>
            <div style="color: #6B7280;">Absent</div>
          </div>
          <div style="background: #F3E8FF; padding: 8px; border-radius: 6px; text-align: center;">
            <div style="font-weight: 600; color: #6B21A8;">${run.late_marks}</div>
            <div style="color: #6B7280;">Late Marks</div>
          </div>
          <div style="background: #DBEAFE; padding: 8px; border-radius: 6px; text-align: center;">
            <div style="font-weight: 600; color: #1E40AF;">${run.overtime_hours}h</div>
            <div style="color: #6B7280;">Overtime</div>
          </div>
          <div style="background: #F3F4F6; padding: 8px; border-radius: 6px; text-align: center;">
            <div style="font-weight: 600; color: #374151;">${run.base_days}</div>
            <div style="color: #6B7280;">Base Days</div>
          </div>
        </div>
      </div>

      <!-- Earnings & Deductions Table -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px;">
        <!-- Earnings -->
        <div>
          <div style="font-weight: 600; font-size: 0.9rem; margin-bottom: 8px; color: #065F46;">Earnings</div>
          <table style="width: 100%; font-size: 0.8rem; border-collapse: collapse;">
            <tr style="border-bottom: 1px solid #E5E7EB;">
              <td style="padding: 6px 0; color: #6B7280;">Basic (${run.snapshot_basic_pct}%)</td>
              <td style="padding: 6px 0; text-align: right; font-weight: 500;">${fc(run.basic_full)}</td>
            </tr>
            <tr style="border-bottom: 1px solid #E5E7EB;">
              <td style="padding: 6px 0; color: #6B7280;">HRA (${run.snapshot_hra_pct}%)</td>
              <td style="padding: 6px 0; text-align: right; font-weight: 500;">${fc(run.hra_full)}</td>
            </tr>
            <tr style="border-bottom: 1px solid #E5E7EB;">
              <td style="padding: 6px 0; color: #6B7280;">Special (${specialPct}%)</td>
              <td style="padding: 6px 0; text-align: right; font-weight: 500;">${fc(run.special_full)}</td>
            </tr>
            ${Number(run.overtime_pay) > 0 ? `<tr style="border-bottom: 1px solid #E5E7EB;">
              <td style="padding: 6px 0; color: #6B7280;">Overtime (${run.snapshot_overtime_multiplier}×)</td>
              <td style="padding: 6px 0; text-align: right; font-weight: 500; color: #2563EB;">${fc(run.overtime_pay)}</td>
            </tr>` : ''}
            ${Number(run.bonus) > 0 ? `<tr style="border-bottom: 1px solid #E5E7EB;">
              <td style="padding: 6px 0; color: #6B7280;">Bonus/Additions</td>
              <td style="padding: 6px 0; text-align: right; font-weight: 500; color: #059669;">${fc(run.bonus)}</td>
            </tr>` : ''}
            <tr style="font-weight: 600;">
              <td style="padding: 8px 0;">Gross</td>
              <td style="padding: 8px 0; text-align: right;">${fc(run.gross_full)}</td>
            </tr>
          </table>
        </div>

        <!-- Deductions -->
        <div>
          <div style="font-weight: 600; font-size: 0.9rem; margin-bottom: 8px; color: #991B1B;">Deductions</div>
          <table style="width: 100%; font-size: 0.8rem; border-collapse: collapse;">
            ${Number(run.lop_deduction) > 0 ? `<tr style="border-bottom: 1px solid #E5E7EB;">
              <td style="padding: 6px 0; color: #6B7280;">LOP (${run.days_absent}d)</td>
              <td style="padding: 6px 0; text-align: right; font-weight: 500; color: #DC2626;">${fc(run.lop_deduction)}</td>
            </tr>` : ''}
            ${Number(run.half_day_deduction) > 0 ? `<tr style="border-bottom: 1px solid #E5E7EB;">
              <td style="padding: 6px 0; color: #6B7280;">Half-Day (${run.half_days}d)</td>
              <td style="padding: 6px 0; text-align: right; font-weight: 500; color: #DC2626;">${fc(run.half_day_deduction)}</td>
            </tr>` : ''}
            ${Number(run.late_deduction) > 0 ? `<tr style="border-bottom: 1px solid #E5E7EB;">
              <td style="padding: 6px 0; color: #6B7280;">Late (${run.late_deduction_days}d)</td>
              <td style="padding: 6px 0; text-align: right; font-weight: 500; color: #DC2626;">${fc(run.late_deduction)}</td>
            </tr>` : ''}
            ${Number(run.other_deductions) > 0 ? `<tr style="border-bottom: 1px solid #E5E7EB;">
              <td style="padding: 6px 0; color: #6B7280;">Other</td>
              <td style="padding: 6px 0; text-align: right; font-weight: 500; color: #DC2626;">${fc(run.other_deductions)}</td>
            </tr>` : ''}
            ${Number(run.total_deductions) === 0 ? `<tr style="border-bottom: 1px solid #E5E7EB;">
              <td style="padding: 6px 0; color: #6B7280;">—</td>
              <td style="padding: 6px 0; text-align: right; color: #6B7280;">None</td>
            </tr>` : ''}
            <tr style="font-weight: 600;">
              <td style="padding: 8px 0;">Total</td>
              <td style="padding: 8px 0; text-align: right; color: #DC2626;">${fc(run.total_deductions)}</td>
            </tr>
          </table>
        </div>
      </div>

      <!-- Net Pay -->
      <div style="background: #065F46; color: white; border-radius: 10px; padding: 16px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <div style="font-size: 1rem; font-weight: 600;">Net Pay</div>
        <div style="font-size: 1.5rem; font-weight: 700;">${fc(run.net_pay)}</div>
      </div>

      <!-- Footer -->
      <div style="text-align: center; font-size: 0.7rem; color: #9CA3AF; margin-top: 12px;">
        Generated by Staff Management • ${run.confirmed_at ? 'Confirmed ' + new Date(run.confirmed_at).toLocaleDateString('en-IN') : 'Draft'}
      </div>
    </div>
    `;
  },

  /**
   * Open a salary slip in a new print window.
   */
  printSlip(run, employeeName, employeeEmail, companyName) {
    const html = this.buildSlipHTML(run, employeeName, employeeEmail, companyName);
    const printWindow = window.open('', '_blank', 'width=700,height=900');
    printWindow.document.write(`<!DOCTYPE html>
    <html>
    <head>
      <title>Salary Slip - ${employeeName} - ${run.pay_month}/${run.pay_year}</title>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', sans-serif; background: #F3F4F6; padding: 24px; }
        @media print {
          body { background: white; padding: 0; }
          .no-print { display: none !important; }
          .salary-slip { box-shadow: none !important; border-radius: 0 !important; }
        }
      </style>
    </head>
    <body>
      <div class="no-print" style="text-align: center; margin-bottom: 16px;">
        <button onclick="window.print()" style="background: #2563EB; color: white; border: none; padding: 10px 24px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 0.95rem;">🖨️ Print Slip</button>
        <button onclick="window.close()" style="background: #6B7280; color: white; border: none; padding: 10px 24px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 0.95rem; margin-left: 8px;">Close</button>
      </div>
      ${html}
    </body>
    </html>`);
    printWindow.document.close();
  },

  /**
   * Get payroll history for a specific employee (for the "You" tab).
   */
  async getEmployeePayrollHistory(userId) {
    try {
      const client = this._requireClient();
      const { data, error } = await client
        .from('payroll_runs')
        .select('*')
        .eq('user_id', userId)
        .order('pay_year', { ascending: false })
        .order('pay_month', { ascending: false })
        .limit(12);

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('[Payroll] getEmployeePayrollHistory error:', err.message);
      return [];
    }
  }
};

window.Payroll = Payroll;

