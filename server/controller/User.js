import { supabase } from '../lib/supabaseClient.js';
import bcrypt from 'bcrypt';

async function fetchData() {
  const { data, error } = await supabase
    .from('users') // Replace with your actual table
    .select('*');

  if (error) console.log('error', error);
  else console.log('data', data);
}

async function createUser(userData) {
  try {
    // Hash the password
    const hashPassword = await bcrypt.hash(userData.password, 10);

    const userToInsert = {
      name: userData.name,
      email: userData.email,
      password_hash: hashPassword,
      role: userData.role,
    };

    const { data, error } = await supabase
      .from('users')
      .insert([userToInsert])
      .select();

    if (error) {
      console.log('error', error);
      return { success: false, error };
    } else {
      console.log('User created:', data);
      return { success: true, data };
    }
  } catch (error) {
    console.log('Hashing error:', error);
    return { success: false, error: error.message };
  }
}

async function loginUser(email, password) {
  try {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .ilike('email', normalizedEmail);

    if (error) {
      console.error('Supabase login query error:', error);
      return { success: false, message: 'Database error during login' };
    }

    if (!users || users.length === 0) {
      return { success: false, message: 'Invalid email or password' };
    }

    for (const user of users) {
      const storedPassword = user.password_hash || user.password || null;
      const passwordMatches = storedPassword
        ? (storedPassword.startsWith('$2')
            ? await bcrypt.compare(password, storedPassword)
            : String(password) === String(storedPassword))
        : false;

      if (passwordMatches) {
        const { password_hash, password: plainPassword, ...userWithoutPassword } = user;
        return { success: true, user: userWithoutPassword };
      }
    }

    return { success: false, message: 'Invalid email or password' };
  } catch (error) {
    console.log('Login error:', error);
    return { success: false, message: 'Login failed' };
  }
}

async function getAllEmployees() {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, role')
      .eq('role', 'employee');

    if (error) {
      console.log('error', error);
      return { success: false, error };
    } else {
      return { success: true, data };
    }
  } catch (error) {
    console.log('Fetch employees error:', error);
    return { success: false, error: error.message };
  }
}

async function getDashboardSummary() {
  try {
    // Total Employees
    const { count: totalEmployees, error: empError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'employee');

    if (empError) throw empError;

    // Total Departments - assuming a departments table
    const { count: totalDepartments, error: depError } = await supabase
      .from('departments')
      .select('*', { count: 'exact', head: true });

    if (depError) throw depError;

    // Total Salaries - assuming a salaries table with amount
    const { data: salaries, error: salError } = await supabase
      .from('salaries')
      .select('amount');

    if (salError) throw salError;

    const totalSalaries = salaries.reduce((sum, s) => sum + s.amount, 0);

    // Leave Summary - assuming a leaves table with status
    const { data: leaves, error: leaveError } = await supabase
      .from('leaves')
      .select('status');

    if (leaveError) throw leaveError;

    const leaveSummary = {
      appliedFor: leaves.length,
      approved: leaves.filter(l => l.status === 'approved').length,
      pending: leaves.filter(l => l.status === 'pending').length,
      rejected: leaves.filter(l => l.status === 'rejected').length
    };

    return {
      success: true,
      data: {
        totalEmployees,
        totalDepartments,
        totalSalaries,
        leaveSummary
      }
    };
  } catch (error) {
    console.log('Get summary error:', error);
    return { success: false, error: error.message };
  }
}

export { fetchData, createUser, loginUser, getAllEmployees, getDashboardSummary };