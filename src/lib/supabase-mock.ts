const activeChannels = new Set<MockChannel>();

class MockChannel {
  name: string;
  private callbacks: Array<{ event: string, filter: any, callback: Function }> = [];
  constructor(name: string) {
    this.name = name;
    activeChannels.add(this);
  }

  on(event: string, filter: any, callback: Function) {
    this.callbacks.push({ event, filter, callback });
    return this;
  }

  subscribe() {
    return this;
  }

  unsubscribe() {
    activeChannels.delete(this);
  }

  dispatchEvent(table: string, event: string, payload: any) {
    this.callbacks.forEach(cb => {
      if (cb.filter.table === table && (cb.event === event || cb.event === '*')) {
        if (cb.filter.filter) {
          const match = cb.filter.filter.match(/^([^=]+)=eq\.(.+)$/);
          if (match) {
            const col = match[1];
            const val = match[2];
            if (payload.new[col] !== val) return;
          }
        }
        cb.callback(payload);
      }
    });
  }
}

class MockQueryBuilder {
  private table: string;
  private operation: 'select' | 'insert' | 'update' | 'delete' | 'upsert' = 'select';
  private opData: any = null;
  private filterFn: ((item: any) => boolean) = () => true;
  private sortFn?: ((a: any, b: any) => number);
  private isSingle = false;

  constructor(table: string) {
    this.table = table;
  }

  private getData(): any[] {
    const key = `mock_db_${this.table}`;
    const val = localStorage.getItem(key);
    if (val) {
      try {
        return JSON.parse(val);
      } catch (e) {
        return [];
      }
    }
    
    // Seed default facilities
    if (this.table === 'facilities') {
      const defaultFacilities = [
        { id: 'FAC-001', name: 'Main Auditorium', type: 'Auditorium', capacity: 500, status: 'Available', equipment: ['Projector', 'Microphone', 'AC', 'Stage Lighting'] },
        { id: 'FAC-002', name: 'CSE Lab 1', type: 'Computer Lab', capacity: 60, status: 'Available', equipment: ['30 Computers', 'Projector', 'AC', 'High-Speed Internet'] },
        { id: 'FAC-003', name: 'Seminar Hall A', type: 'Seminar Hall', capacity: 120, status: 'Available', equipment: ['Projector', 'Whiteboard', 'AC', 'Microphone'] },
        { id: 'FAC-004', name: 'Classroom 101', type: 'Classroom', capacity: 60, status: 'Available', equipment: ['Whiteboard', 'Projector', 'Ceiling Fan'] },
        { id: 'FAC-005', name: 'Sports Hall', type: 'Sports', capacity: 200, status: 'Maintenance', equipment: ['Basketball Court', 'Changing Rooms', 'Scoreboard'] }
      ];
      localStorage.setItem(key, JSON.stringify(defaultFacilities));
      return defaultFacilities;
    }

    // Seed default bookings
    if (this.table === 'bookings') {
      const todayStr = new Date().toISOString().split('T')[0];
      const defaultBookings = [
        { id: 'BKG-1001', title: 'CSE Department Meeting', time: `${todayStr} at 09:00 AM - 10:30 AM`, location: 'Seminar Hall A', organizer: 'HOD CSE', organizer_email: 'admin@pvpsit.edu.in', status: 'Confirmed' },
        { id: 'BKG-1002', title: 'Guest Lecture on AI/ML', time: `${todayStr} at 02:00 PM - 04:00 PM`, location: 'Main Auditorium', organizer: 'Dr. Prasad', organizer_email: 'admin1@pvpsit.edu.in', status: 'Pending' },
        { id: 'BKG-1003', title: 'Web Development Workshop', time: `${todayStr} at 10:00 AM - 01:00 PM`, location: 'CSE Lab 1', organizer: 'Student Club', organizer_email: 'student@pvpsit.edu.in', status: 'Confirmed' }
      ];
      localStorage.setItem(key, JSON.stringify(defaultBookings));
      return defaultBookings;
    }

    // Seed default tickets
    if (this.table === 'maintenance_tickets') {
      const defaultTickets = [
        { id: 'TCK-2001', title: 'AC Not Cooling', location: 'CSE Lab 1', priority: 'High', status: 'Open', date: new Date().toISOString().split('T')[0], assigned_to: 'Unassigned' },
        { id: 'TCK-2002', title: 'Projector Bulb Replacement', location: 'Main Auditorium', priority: 'Medium', status: 'In Progress', date: new Date().toISOString().split('T')[0], assigned_to: 'Ravi Kumar' },
        { id: 'TCK-2003', title: 'Whiteboard Marker Holder Broken', location: 'Seminar Hall A', priority: 'Low', status: 'Completed', date: new Date().toISOString().split('T')[0], assigned_to: 'Suresh Babu' }
      ];
      localStorage.setItem(key, JSON.stringify(defaultTickets));
      return defaultTickets;
    }

    // Seed default assets
    if (this.table === 'assets') {
      const defaultAssets = [
        { id: 'AST-3001', name: 'Dell OptiPlex Desktop', category: 'Computers', location: 'CSE Lab 1', status: 'Active', purchase_date: '2024-06-15' },
        { id: 'AST-3002', name: 'Epson Projector EB-E01', category: 'Projector', location: 'Main Auditorium', status: 'Active', purchase_date: '2023-11-20' },
        { id: 'AST-3003', name: 'Voltas 2 Ton Split AC', category: 'AC', location: 'CSE Lab 1', status: 'In Repair', purchase_date: '2025-01-10' }
      ];
      localStorage.setItem(key, JSON.stringify(defaultAssets));
      return defaultAssets;
    }

    return [];
  }

  private saveData(data: any[]) {
    localStorage.setItem(`mock_db_${this.table}`, JSON.stringify(data));
  }

  select(_columns: string = '*') {
    // Only set select if not already set to a modifying operation
    if (this.operation === 'select') {
      this.operation = 'select';
    }
    return this;
  }

  insert(row: any) {
    this.operation = 'insert';
    this.opData = row;
    return this;
  }

  update(row: any) {
    this.operation = 'update';
    this.opData = row;
    return this;
  }

  upsert(row: any) {
    this.operation = 'upsert';
    this.opData = row;
    return this;
  }

  delete() {
    this.operation = 'delete';
    return this;
  }

  order(column: string, { ascending = true } = {}) {
    this.sortFn = (a: any, b: any) => {
      const valA = a[column];
      const valB = b[column];
      if (valA < valB) return ascending ? -1 : 1;
      if (valA > valB) return ascending ? 1 : -1;
      return 0;
    };
    return this;
  }

  eq(column: string, value: any) {
    const prevFilter = this.filterFn;
    this.filterFn = (item: any) => prevFilter(item) && String(item[column]) === String(value);
    return this;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  async then(onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any) {
    try {
      let data = this.getData();
      let result: any = null;
      let error: any = null;

      if (this.operation === 'select') {
        let filtered = data.filter(this.filterFn);
        if (this.sortFn) {
          filtered.sort(this.sortFn);
        }
        result = this.isSingle ? (filtered.length > 0 ? filtered[0] : null) : filtered;
      } 
      else if (this.operation === 'insert') {
        const row = this.opData;
        if (!row.id) {
          row.id = `${this.table.substring(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
        }
        row.created_at = new Date().toISOString();
        data.push(row);
        this.saveData(data);

        activeChannels.forEach(ch => {
          ch.dispatchEvent(this.table, 'INSERT', { new: row });
        });

        window.dispatchEvent(new CustomEvent('pvpsit_notifications_updated'));
        result = this.isSingle ? row : [row];
      } 
      else if (this.operation === 'update') {
        let updatedRow: any = null;
        let oldRow: any = null;
        const newData = data.map(item => {
          if (this.filterFn(item)) {
            oldRow = { ...item };
            updatedRow = { ...item, ...this.opData };
            return updatedRow;
          }
          return item;
        });
        this.saveData(newData);

        if (updatedRow) {
          activeChannels.forEach(ch => {
            ch.dispatchEvent(this.table, 'UPDATE', { old: oldRow, new: updatedRow });
          });
        }

        window.dispatchEvent(new CustomEvent('pvpsit_notifications_updated'));
        result = this.isSingle ? updatedRow : (updatedRow ? [updatedRow] : []);
      } 
      else if (this.operation === 'upsert') {
        const row = this.opData;
        let found = false;
        const newData = data.map(item => {
          if (item.id === row.id) {
            found = true;
            return { ...item, ...row };
          }
          return item;
        });
        if (!found) {
          newData.push(row);
        }
        this.saveData(newData);

        activeChannels.forEach(ch => {
          ch.dispatchEvent(this.table, 'INSERT', { new: row });
        });

        window.dispatchEvent(new CustomEvent('pvpsit_notifications_updated'));
        result = this.isSingle ? row : [row];
      } 
      else if (this.operation === 'delete') {
        const toDelete = data.filter(this.filterFn);
        const newData = data.filter(item => !this.filterFn(item));
        this.saveData(newData);

        toDelete.forEach(row => {
          activeChannels.forEach(ch => {
            ch.dispatchEvent(this.table, 'DELETE', { old: row });
          });
        });

        window.dispatchEvent(new CustomEvent('pvpsit_notifications_updated'));
        result = toDelete;
      }

      const res = { data: result, error };
      if (onfulfilled) {
        return Promise.resolve(onfulfilled(res));
      }
      return Promise.resolve(res);
    } catch (err) {
      if (onrejected) {
        return Promise.resolve(onrejected({ data: null, error: err }));
      }
      return Promise.resolve({ data: null, error: err });
    }
  }
}

export function createMockSupabase() {
  const profilesKey = 'mock_db_profiles';
  const profilesVal = localStorage.getItem(profilesKey);
  if (!profilesVal) {
    localStorage.setItem(profilesKey, JSON.stringify([
      {
        id: 'admin-user-id-1234',
        email: 'admin@pvpsit.edu.in',
        full_name: 'System Admin',
        role: 'Admin'
      },
      {
        id: 'admin-user-id-5678',
        email: 'admin1@pvpsit.edu.in',
        full_name: 'Admin User 1',
        role: 'Admin'
      },
      {
        id: 'student-user-id-9012',
        email: 'student@pvpsit.edu.in',
        full_name: 'Student User',
        role: 'Student'
      }
    ]));
  }

  return {
    auth: {
      async getSession() {
        const sessionStr = localStorage.getItem('mock_session');
        if (sessionStr) {
          try {
            const session = JSON.parse(sessionStr);
            return { data: { session }, error: null };
          } catch (e) {}
        }
        return { data: { session: null }, error: null };
      },
      async getUser() {
        const sessionStr = localStorage.getItem('mock_session');
        if (sessionStr) {
          try {
            const session = JSON.parse(sessionStr);
            return { data: { user: session.user }, error: null };
          } catch (e) {}
        }
        return { data: { user: null }, error: null };
      },
      onAuthStateChange(callback: (event: string, session: any) => void) {
        const handler = () => {
          const sessionStr = localStorage.getItem('mock_session');
          const session = sessionStr ? JSON.parse(sessionStr) : null;
          callback('SIGNED_IN', session);
        };
        window.addEventListener('mock_auth_change', handler);
        return {
          data: {
            subscription: {
              unsubscribe() {
                window.removeEventListener('mock_auth_change', handler);
              }
            }
          }
        };
      },
      async signInWithPassword({ email }: any) {
        const profiles = JSON.parse(localStorage.getItem(profilesKey) || '[]');
        const profile = profiles.find((p: any) => p.email === email);
        if (!profile) {
          throw new Error('User not found. Check credentials or sign up.');
        }
        const user = {
          id: profile.id,
          email: profile.email,
          user_metadata: {
            role: profile.role,
            full_name: profile.full_name
          }
        };
        const session = { user, token: 'mock_token_123' };
        localStorage.setItem('mock_session', JSON.stringify(session));
        window.dispatchEvent(new Event('mock_auth_change'));
        return { data: { user }, error: null };
      },
      async signUp({ email, options }: any) {
        const id = `user-${Math.floor(1000 + Math.random() * 9000)}`;
        const user = {
          id,
          email,
          user_metadata: {
            role: options?.data?.role || 'Student',
            full_name: options?.data?.full_name || ''
          }
        };
        
        const profiles = JSON.parse(localStorage.getItem(profilesKey) || '[]');
        if (profiles.some((p: any) => p.email === email)) {
          throw new Error('User already exists');
        }
        profiles.push({
          id,
          email,
          full_name: user.user_metadata.full_name,
          role: user.user_metadata.role
        });
        localStorage.setItem(profilesKey, JSON.stringify(profiles));

        const session = { user, token: 'mock_token_123' };
        localStorage.setItem('mock_session', JSON.stringify(session));
        window.dispatchEvent(new Event('mock_auth_change'));
        return { data: { user }, error: null };
      },
      async signOut() {
        localStorage.removeItem('mock_session');
        window.dispatchEvent(new Event('mock_auth_change'));
        return { error: null };
      },
      async updateUser({ data }: any) {
        const sessionStr = localStorage.getItem('mock_session');
        if (sessionStr) {
          const session = JSON.parse(sessionStr);
          if (data?.full_name) {
            session.user.user_metadata.full_name = data.full_name;
            
            const profiles = JSON.parse(localStorage.getItem(profilesKey) || '[]');
            const updatedProfiles = profiles.map((p: any) => {
              if (p.id === session.user.id) {
                return { ...p, full_name: data.full_name };
              }
              return p;
            });
            localStorage.setItem(profilesKey, JSON.stringify(updatedProfiles));
          }
          localStorage.setItem('mock_session', JSON.stringify(session));
          window.dispatchEvent(new Event('mock_auth_change'));
        }
        return { error: null };
      }
    },
    from(table: string) {
      return new MockQueryBuilder(table);
    },
    channel(name: string) {
      return new MockChannel(name);
    },
    removeChannel(ch: any) {
      if (ch && typeof ch.unsubscribe === 'function') {
        ch.unsubscribe();
      }
    }
  };
}
