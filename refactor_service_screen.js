const fs = require('fs');
const filePath = 'partner_delivery_app/src/screens/owner/ServiceManagementScreen.tsx';
let content = fs.readFileSync(filePath, 'utf-8');

// Replace INITIAL_SERVICES with an empty array or remove it
content = content.replace(/const INITIAL_SERVICES = \[[\s\S]*?\];/g, '');

// Import useEffect and partnerService
if (!content.includes('useEffect')) {
    content = content.replace("import React, { useState } from 'react';", "import React, { useState, useEffect } from 'react';");
}
content = content.replace("import { COLORS, FONTS, SPACING, SIZES } from '../../theme';", "import { COLORS, FONTS, SPACING, SIZES } from '../../theme';\nimport { partnerService } from '../../services/partnerService';\nimport { useAuth } from '../../context/AuthContext';");

// Update the component to fetch data
const hookLogic = `
  const { user } = useAuth();
  const shopId = user?.shop_id;
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchServices();
  }, [shopId]);

  const fetchServices = async () => {
    if (!shopId) return;
    setLoading(true);
    const data = await partnerService.getShopServices(shopId);
    setServices(data || []);
    setLoading(false);
  };
`;

content = content.replace(/const \[services, setServices\] = useState\(INITIAL_SERVICES\);/g, "const [services, setServices] = useState<any[]>([]);" + hookLogic);

// Update add service function
const addLogic = `
  const handleAddService = async () => {
    if (!name || !price || !shopId) {
      Alert.alert('Required Fields', 'Please fill in Service Name and Base Price');
      return;
    }
    
    // Attempt to map category to ID (hardcoded 1 for Wash & Fold, etc., or just pass string if API takes string name/id)
    // The API expects category_id. We'll pass 1 as default if category isn't matched
    let catId = 1;
    if (category === 'Dry Clean') catId = 2;
    if (category === 'Ironing') catId = 3;

    const payload = {
      shop_id: shopId,
      name,
      category_id: catId,
      price: parseFloat(price.replace(/[^0-9.]/g, '') || '0'),
      unit: pricingType === 'Piece Wise' ? 'piece' : 'KG',
    };
    
    const res = await partnerService.createShopService(payload);
    if (res?.success) {
      setShowAddModal(false);
      setName('');
      setPrice('');
      setExpressCharge('');
      setSpecialCharge('');
      fetchServices();
      Alert.alert('Success', 'New service added successfully!');
    } else {
      Alert.alert('Error', res?.message || 'Failed to add service');
    }
  };
`;
content = content.replace(/const handleAddService = \(\) => \{[\s\S]*?Alert.alert\('Success', 'New service added successfully!'\);\n  \};/g, addLogic);


// Update toggle logic
const toggleLogic = `
  const toggleAvailability = async (id: string | number) => {
    // Optimistic update
    setServices((prev) =>
      prev.map((s) => (s.id === id ? { ...s, is_active: !s.is_active } : s))
    );
    const service = services.find(s => s.id === id);
    if (service) {
      await partnerService.updateShopService(id, { ...service, is_active: service.is_active ? 0 : 1 });
      fetchServices();
    }
  };
`;
content = content.replace(/const toggleAvailability = \(id: string\) => \{[\s\S]*?\};\n  \};/g, toggleLogic);


// In render function, we need to map the backend 'price' and 'unit' fields.
content = content.replace(/s\.isAvailable/g, 's.is_active');
content = content.replace(/s\.price/g, '`₹${s.price || 0} / ${s.unit || "piece"}`');


fs.writeFileSync(filePath, content, 'utf-8');
console.log('Updated ServiceManagementScreen.tsx');
