const fs = require('fs');

function refactorCustomers() {
    const filePath = 'partner_delivery_app/src/screens/owner/CustomerManagementScreen.tsx';
    let content = fs.readFileSync(filePath, 'utf-8');

    // Replace fallback logic
    content = content.replace(/\} else \{\s*setCustomers\(FALLBACK_CUSTOMERS\);\s*\}/g, '} else { setCustomers([]); }');
    content = content.replace(/\} catch \{\s*setCustomers\(FALLBACK_CUSTOMERS\);\s*\}/g, '} catch { setCustomers([]); }');

    fs.writeFileSync(filePath, content, 'utf-8');
    console.log('Updated CustomerManagementScreen.tsx');
}

function refactorOrders() {
    const filePath = 'partner_delivery_app/src/screens/owner/OrderManagementScreen.tsx';
    let content = fs.readFileSync(filePath, 'utf-8');
    
    // Replace fallback logic
    content = content.replace(/if \(!res \|\| res\.length === 0\) \{\s*setOrders\(DEMO_ORDERS\);\s*return;\s*\}/g, 'if (!res || res.length === 0) { setOrders([]); return; }');
    content = content.replace(/\} catch \(err\) \{\s*setOrders\(DEMO_ORDERS\);\s*\}/g, '} catch (err) { setOrders([]); }');

    fs.writeFileSync(filePath, content, 'utf-8');
    console.log('Updated OrderManagementScreen.tsx');
}

refactorCustomers();
refactorOrders();
