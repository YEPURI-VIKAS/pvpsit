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
    return data ?? [];
  }

  // GET /login-history/* (not stored in Supabase - return empty gracefully)
  if (endpoint.startsWith('/login-history/')) {
    return [];
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
      data: { full_name: body.fullName },
    });
    if (error) throw new Error(error.message);
    // Also update the profiles table
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('profiles').upsert({
        id: user.id,
        email: user.email,
        full_name: body.fullName,
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

