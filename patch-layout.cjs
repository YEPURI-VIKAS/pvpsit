const fs = require('fs');
let content = fs.readFileSync('src/components/Layout.tsx', 'utf8');

const brokenStart = content.indexOf('// Supabase Realtime');
const brokenEnd = content.indexOf('  const handleMarkAllAsRead');

if (brokenStart === -1 || brokenEnd === -1) {
  console.log('Markers not found:', brokenStart, brokenEnd);
  process.exit(1);
}

// Walk back two spaces before the comment
const blockStart = brokenStart - 2; // include the leading two spaces

const cleanBlock = [
  '  // Supabase Realtime - live notifications (replaces WebSocket)',
  '  useEffect(() => {',
  '    if (!user?.email) return;',
  '    const isAdmin = user?.user_metadata?.role === "Admin";',
  '    const channelName = "live-" + user.email + "-" + (user?.user_metadata?.role || "guest");',
  '    const ch = supabase.channel(channelName);',
  '    if (isAdmin) {',
  '      ch',
  '        .on("postgres_changes", { event: "INSERT", schema: "public", table: "bookings" }, (payload: any) => {',
  '          addNotifRef.current("New Booking Request",',
  '            "New booking at " + payload.new.location + " submitted by " + payload.new.organizer + ".");',
  '        })',
  '        .on("postgres_changes", { event: "INSERT", schema: "public", table: "maintenance_tickets" }, (payload: any) => {',
  '          addNotifRef.current("New Maintenance Request",',
  '            "Issue at " + payload.new.location + " - Priority: " + payload.new.priority + ".");',
  '        })',
  '        .on("postgres_changes", { event: "INSERT", schema: "public", table: "assets" }, (payload: any) => {',
  '          addNotifRef.current("New Asset Registered",',
  '            "Asset " + payload.new.name + " (" + payload.new.category + ") added to inventory.");',
  '        });',
  '    } else {',
  '      ch',
  '        .on("postgres_changes", {',
  '          event: "UPDATE", schema: "public", table: "bookings",',
  '          filter: "organizer_email=eq." + user.email,',
  '        }, (payload: any) => {',
  '          const s = payload.new.status;',
  '          const loc = payload.new.location;',
  '          if (payload.old.status === s) return;',
  '          if (s === "Confirmed") {',
  '            addNotifRef.current("Booking Confirmed", "Your booking at " + loc + " has been confirmed!");',
  '          } else if (s === "Rejected" || s === "Cancelled") {',
  '            addNotifRef.current("Booking Rejected", "Your booking at " + loc + " was rejected.");',
  '          } else {',
  '            addNotifRef.current("Booking " + s, "Your booking at " + loc + " is now " + s.toLowerCase() + ".");',
  '          }',
  '        })',
  '        .on("postgres_changes", {',
  '          event: "UPDATE", schema: "public", table: "maintenance_tickets",',
  '        }, (payload: any) => {',
  '          if (payload.old.status === payload.new.status) return;',
  '          addNotifRef.current("Maintenance Update",',
  '            "Ticket is now " + payload.new.status + ".");',
  '        });',
  '    }',
  '    ch.subscribe();',
  '    return () => { supabase.removeChannel(ch); };',
  '  }, [user?.email, user?.user_metadata?.role]);',
  '',
].join('\n');

content = content.slice(0, blockStart) + cleanBlock + content.slice(brokenEnd);
fs.writeFileSync('src/components/Layout.tsx', content, 'utf8');
console.log('Patched successfully. New length:', content.length);
