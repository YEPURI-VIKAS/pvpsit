const fetch = require('node-fetch');

async function test() {
    try {
        const loginRes = await fetch('http://localhost:8080/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin1@pvpsit.edu.in', password: 'admin123' })
        });
        const loginData = await loginRes.json();
        console.log('Login status:', loginRes.status);
        if (loginRes.status !== 200) {
            console.log(loginData);
            return;
        }

        const token = loginData.token;

        const facRes = await fetch('http://localhost:8080/api/facilities', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const facData = await facRes.json();
        console.log('Facilities count:', facData.length);
        if (facData.length === 0) console.log(facData);

        const bookRes = await fetch('http://localhost:8080/api/bookings', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const bookData = await bookRes.json();
        console.log('Bookings count:', bookData.length);
        
    } catch(e) {
        console.error(e);
    }
}
test();
