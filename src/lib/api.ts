// api.ts — Supabase-backed API layer.
// Keeps the same interface (api.get, api.post, api.patch, api.delete) so all pages work unchanged.
// Routes are mapped to Supabase table operations with snake_case ↔ camelCase conversion.
import { supabase } from './supabase';

// ── Helpers ──────────────────────────────────────────────────────────────────

function toBooking(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    time: row.time,
    location: row.location,
    organizer: row.organizer,
    organizerEmail: row.organizer_email,
    status: row.status,
    facilityId: row.facility_id,
    assetId: row.asset_id,
  };
}

function toBookingRow(body: any) {
  return {
    id: body.id,
    title: body.title,
    time: body.time,
    location: body.location,
    organizer: body.organizer,
    organizer_email: body.organizerEmail ?? body.organizer_email ?? '',
    status: body.status ?? 'Pending',
    facility_id: body.facilityId ?? body.facility_id ?? null,
    asset_id: body.assetId ?? body.asset_id ?? null,
  };
}

function toAsset(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    location: row.location,
    status: row.status,
    purchaseDate: row.purchase_date,
    image: row.image ?? '',
  };
}

function toAssetRow(body: any) {
  return {
    id: body.id,
    name: body.name,
    category: body.category,
    location: body.location,
    status: body.status,
    purchase_date: body.purchaseDate ?? body.purchase_date ?? '',
    image: body.image ?? '',
  };
}

function toTicket(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    location: row.location,
    priority: row.priority,
    status: row.status,
    date: row.date,
    assignedTo: row.assigned_to,
  };
}

function toTicketRow(body: any) {
  return {
    id: body.id,
    title: body.title,
    location: body.location,
    priority: body.priority,
    status: body.status ?? 'Open',
    date: body.date,
    assigned_to: body.assignedTo ?? body.assigned_to ?? 'Unassigned',
  };
}

function toFacility(row: any) {
  if (!row) return null;
  // equipment may be null (old Spring Boot rows) or text[] (new rows)
  let equipment: string[] = [];
  if (Array.isArray(row.equipment)) equipment = row.equipment;
  else if (typeof row.equipment === 'string' && row.equipment) equipment = [row.equipment];
  return {
    id: String(row.id ?? ''),
    name: row.name ?? '',
    type: row.type ?? '',
    capacity: Number(row.capacity ?? 0),
    status: row.status ?? 'Available',
    image: row.image ?? '',
    equipment,
  };
}

function toFacilityRow(body: any) {
  const row: any = {
    id: body.id,
    name: body.name,
    type: body.type,
    capacity: body.capacity,
    status: body.status ?? 'Available',
    equipment: Array.isArray(body.equipment) ? body.equipment : [],
  };
  // Only include image if provided (old tables may not have the column)
  if (body.image !== undefined) row.image = body.image;
  return row;
}

// ── Auto Release Expired Bookings ────────────────────────────────────────────

export const checkAndReleaseFacilities = async () => {
  try {
    const { data: bookings } = await supabase.from('bookings').select('*');
    if (!bookings) return;
    
    let needsUpdate = false;
    
    for (const b of bookings) {
      if (b.status !== 'Confirmed') continue;
      
      const timeString = b.time || '';
      const regex = /^(\d{4}-\d{2}-\d{2})\s+at\s+(.+?)\s+-\s+(.+)$/;
      const match = timeString.match(regex);
      if (!match) continue;
      
      const datePart = match[1];
      const endTimeStr = match[3];
      
      const timeMatch = endTimeStr.match(/^(\d{1,2}):(\d{2})\s+(AM|PM)$/i);
      if (!timeMatch) continue;
      
      let hours = parseInt(timeMatch[1], 10);
      const minutes = parseInt(timeMatch[2], 10);
      const ampm = timeMatch[3].toUpperCase();
      
      if (ampm === 'PM' && hours < 12) hours += 12;
      if (ampm === 'AM' && hours === 12) hours = 0;
      
      const endDate = new Date(`${datePart}T00:00:00`);
      endDate.setHours(hours, minutes, 0, 0);
      
      if (endDate < new Date()) {
        // Expired! Update booking to Completed
        await supabase.from('bookings').update({ status: 'Completed' }).eq('id', b.id);
        needsUpdate = true;
        
        // Find corresponding facility and set to Available
        if (b.facility_id) {
          await supabase.from('facilities').update({ status: 'Available' }).eq('id', b.facility_id);
        } else if (b.location) {
          // Fallback location match
          const { data: facs } = await supabase.from('facilities').select('*');
          const matched = (facs || []).find(f => f.name.toLowerCase() === b.location.toLowerCase() || f.id.toLowerCase() === b.location.toLowerCase());
          if (matched) {
             await supabase.from('facilities').update({ status: 'Available' }).eq('id', matched.id);
          }
        }
      }
    }
    
    if (needsUpdate) {
      // Dispatch a custom event to notify components (like Bookings and Facilities pages)
      window.dispatchEvent(new Event('bookings_auto_updated'));
    }
  } catch (error) {
    console.error('Error auto-releasing facilities:', error);
  }
};

// ── Generic error handler ────────────────────────────────────────────────────

function handleError(error: any) {
  if (error) {
    console.error('Supabase error:', error.message);
    throw new Error(error.message);
  }
}

// ── Route resolver ───────────────────────────────────────────────────────────

async function resolveGet(endpoint: string): Promise<any> {
  // GET /bookings
  if (endpoint === '/bookings') {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .order('id', { ascending: false });
    handleError(error);
    return (data ?? []).map(toBooking);
  }

  // GET /facilities
  if (endpoint === '/facilities') {
    const { data, error } = await supabase
      .from('facilities')
      .select('*');
    handleError(error);
    return (data ?? []).map(toFacility);
  }

  // GET /assets
  if (endpoint === '/assets') {
    const { data, error } = await supabase
      .from('assets')
      .select('*')
      .order('id', { ascending: false });
    handleError(error);
    return (data ?? []).map(toAsset);
  }

  // GET /tickets
  if (endpoint === '/tickets') {
    const { data, error } = await supabase
      .from('maintenance_tickets')
      .select('*')
      .order('id', { ascending: false });
    handleError(error);
    return (data ?? []).map(toTicket);
  }

  // GET /users (user management page)
  if (endpoint === '/users') {
    const { data, error } = await supabase
      .from('profiles')
      .select('*');
    handleError(error);
    return (data ?? []).map((row: any) => ({
      id: row.id,
      email: row.email,
      fullName: row.full_name,
      avatarUrl: row.avatar_url,
      role: row.role,
      createdAt: row.created_at,
    }));
  }

  // GET /login-history
  if (endpoint === '/login-history') {
    const { data, error } = await supabase
      .from('login_history')
      .select('*')
      .order('timestamp', { ascending: false });
    if (error && error.code === '42P01') return []; // table doesn't exist yet
    handleError(error);
    return (data ?? []).map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      email: row.email,
      timestamp: row.timestamp,
      action: row.action,
      ipAddress: row.ip_address,
    }));
  }

  // GET /login-history/user/:id
  const historyUserMatch = endpoint.match(/^\/login-history\/user\/([^/]+)$/);
  if (historyUserMatch) {
    const id = historyUserMatch[1];
    const { data, error } = await supabase
      .from('login_history')
      .select('*')
      .eq('user_id', id)
      .order('timestamp', { ascending: false });
    if (error && error.code === '42P01') return []; // table doesn't exist yet
    handleError(error);
    return (data ?? []).map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      email: row.email,
      timestamp: row.timestamp,
      action: row.action,
      ipAddress: row.ip_address,
    }));
  }

  throw new Error(`Unhandled GET endpoint: ${endpoint}`);
}

async function resolvePost(endpoint: string, body: any): Promise<any> {
  // POST /bookings
  if (endpoint === '/bookings') {
    const row = toBookingRow(body);
    const { data, error } = await supabase
      .from('bookings')
      .insert(row)
      .select()
      .single();
    handleError(error);
    return toBooking(data);
  }

  // POST /facilities
  if (endpoint === '/facilities') {
    const row = toFacilityRow(body);
    const { data, error } = await supabase
      .from('facilities')
      .insert(row)
      .select()
      .single();
    handleError(error);
    return toFacility(data);
  }

  // POST /assets
  if (endpoint === '/assets') {
    const row = toAssetRow(body);
    const { data, error } = await supabase
      .from('assets')
      .insert(row)
      .select()
      .single();
    handleError(error);
    return toAsset(data);
  }

  // POST /tickets
  if (endpoint === '/tickets') {
    const row = toTicketRow(body);
    const { data, error } = await supabase
      .from('maintenance_tickets')
      .insert(row)
      .select()
      .single();
    handleError(error);
    return toTicket(data);
  }

  // POST /login-history
  if (endpoint === '/login-history') {
    const { data, error } = await supabase
      .from('login_history')
      .insert({
        user_id: body.userId,
        email: body.email,
        action: body.action,
        ip_address: body.ipAddress,
      })
      .select()
      .single();
    if (error && error.code === '42P01') return {}; // gracefully handle if table not created
    handleError(error);
    return data;
  }

  throw new Error(`Unhandled POST endpoint: ${endpoint}`);
}

async function resolvePatch(endpoint: string, body: any): Promise<any> {
  // PATCH /bookings/:id/status
  const bookingStatusMatch = endpoint.match(/^\/bookings\/([^/]+)\/status$/);
  if (bookingStatusMatch) {
    const id = bookingStatusMatch[1];
    const { data, error } = await supabase
      .from('bookings')
      .update({ status: body.status })
      .eq('id', id)
      .select()
      .single();
    handleError(error);
    return toBooking(data);
  }

  // PATCH /facilities/:id
  const facilityMatch = endpoint.match(/^\/facilities\/([^/]+)$/);
  if (facilityMatch) {
    const id = facilityMatch[1];
    const { data, error } = await supabase
      .from('facilities')
      .update(toFacilityRow(body))
      .eq('id', id)
      .select()
      .single();
    handleError(error);
    return toFacility(data);
  }

  // PATCH /assets/:id
  const assetMatch = endpoint.match(/^\/assets\/([^/]+)$/);
  if (assetMatch) {
    const id = assetMatch[1];
    const { data, error } = await supabase
      .from('assets')
      .update(toAssetRow(body))
      .eq('id', id)
      .select()
      .single();
    handleError(error);
    return toAsset(data);
  }

  // PATCH /tickets/:id/status
  const ticketStatusMatch = endpoint.match(/^\/tickets\/([^/]+)\/status$/);
  if (ticketStatusMatch) {
    const id = ticketStatusMatch[1];
    const { data, error } = await supabase
      .from('maintenance_tickets')
      .update({ status: body.status })
      .eq('id', id)
      .select()
      .single();
    handleError(error);
    return toTicket(data);
  }

  // PATCH /facilities/:id/status
  const facilityStatusMatch = endpoint.match(/^\/facilities\/([^/]+)\/status$/);
  if (facilityStatusMatch) {
    const id = facilityStatusMatch[1];
    const { data, error } = await supabase
      .from('facilities')
      .update({ status: body.status })
      .eq('id', id)
      .select()
      .single();
    handleError(error);
    return toFacility(data);
  }

  // PATCH /users/:id/role
  const userRoleMatch = endpoint.match(/^\/users\/([^/]+)\/role$/);
  if (userRoleMatch) {
    const id = userRoleMatch[1];
    const { error } = await supabase
      .from('profiles')
      .update({ role: body.role })
      .eq('id', id);
    handleError(error);
    return {};
  }

  throw new Error(`Unhandled PATCH endpoint: ${endpoint}`);
}

async function resolveDelete(endpoint: string): Promise<any> {
  // DELETE /bookings/:id
  const bookingMatch = endpoint.match(/^\/bookings\/([^/]+)$/);
  if (bookingMatch) {
    const id = bookingMatch[1];
    const { error } = await supabase.from('bookings').delete().eq('id', id);
    handleError(error);
    return {};
  }

  // DELETE /facilities/:id
  const facilityMatch = endpoint.match(/^\/facilities\/([^/]+)$/);
  if (facilityMatch) {
    const id = facilityMatch[1];
    const { error } = await supabase.from('facilities').delete().eq('id', id);
    handleError(error);
    return {};
  }

  // DELETE /assets/:id
  const assetMatch = endpoint.match(/^\/assets\/([^/]+)$/);
  if (assetMatch) {
    const id = assetMatch[1];
    const { error } = await supabase.from('assets').delete().eq('id', id);
    handleError(error);
    return {};
  }

  // DELETE /tickets/:id
  const ticketMatch = endpoint.match(/^\/tickets\/([^/]+)$/);
  if (ticketMatch) {
    const id = ticketMatch[1];
    const { error } = await supabase.from('maintenance_tickets').delete().eq('id', id);
    handleError(error);
    return {};
  }

  // DELETE /users/:id
  const userMatch = endpoint.match(/^\/users\/([^/]+)$/);
  if (userMatch) {
    const id = userMatch[1];
    const { error } = await supabase.from('profiles').delete().eq('id', id);
    handleError(error);
    return {};
  }

  throw new Error(`Unhandled DELETE endpoint: ${endpoint}`);
}

async function resolvePut(endpoint: string, body: any): Promise<any> {
  // PUT /auth/password — change password via Supabase Auth
  if (endpoint === '/auth/password') {
    const { error } = await supabase.auth.updateUser({ password: body.newPassword });
    if (error) throw new Error(error.message);
    return {};
  }

  // PUT /auth/profile — update display name via Supabase Auth metadata
  if (endpoint === '/auth/profile') {
    const { error } = await supabase.auth.updateUser({
      data: { 
        full_name: body.fullName,
        ...(body.avatarUrl !== undefined && { avatar_url: body.avatarUrl })
      },
    });
    if (error) throw new Error(error.message);
    // Also update the profiles table
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('profiles').upsert({
        id: user.id,
        email: user.email,
        full_name: body.fullName,
        avatar_url: body.avatarUrl || user.user_metadata?.avatar_url,
        role: user.user_metadata?.role,
      });
    }
    return {};
  }

  // Fall back to PATCH for other PUT calls (bookings, facilities, etc.)
  return resolvePatch(endpoint, body);
}

// ── Public API ────────────────────────────────────────────────────────────────

export const api = {
  get<T>(endpoint: string): Promise<T> {
    return resolveGet(endpoint) as Promise<T>;
  },

  post<T>(endpoint: string, body: any): Promise<T> {
    return resolvePost(endpoint, body) as Promise<T>;
  },

  patch<T>(endpoint: string, body: any): Promise<T> {
    return resolvePatch(endpoint, body) as Promise<T>;
  },

  put<T>(endpoint: string, body: any): Promise<T> {
    return resolvePut(endpoint, body) as Promise<T>;
  },

  delete<T>(endpoint: string): Promise<T> {
    return resolveDelete(endpoint) as Promise<T>;
  },
};

export async function uploadImage(file: File, bucket: string = 'facility-photos'): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
  const filePath = `${fileName}`;

  const isMock = !(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);

  if (!isMock) {
    const { error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });
    if (error) {
      throw error;
    }
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);
    return publicUrl;
  } else {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}

