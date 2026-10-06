const fs = require('fs');
const filePath = 'customer_app/src/screens/home/HomeScreen.tsx';
let content = fs.readFileSync(filePath, 'utf-8');

// Add banners state
if (!content.includes('const [banners, setBanners] = useState<any[]>([])')) {
    content = content.replace(/const \[popularShops, setPopularShops\] = useState<any\[\]>\(\[\]\);/g, "const [popularShops, setPopularShops] = useState<any[]>([]);\n  const [banners, setBanners] = useState<any[]>([]);");
}

// Add fetch for banners
const fetchLogic = `
      const bannersData = await apiClient.get('/banners').then(res => res.data.data).catch(() => []);
      setBanners(bannersData || []);
`;
content = content.replace(/const pop = await apiClient\.get\('\/shops\/popular'\)\.then\(res => res\.data\.data\);/g, fetchLogic + "\n      const pop = await apiClient.get('/shops/popular').then(res => res.data.data);");

// Update Promo Banner Slider rendering
const newSliderLogic = `
        {/* ── Promo Banner Slider ── */}
        {banners && banners.length > 0 && (
        <ScrollView
          ref={promoScrollViewRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md }}
        >
          {banners.map((item, index) => (
            <TouchableOpacity
              key={index}
              activeOpacity={0.9}
              onPress={() => navigation.navigate('Booking')}
              style={{ marginRight: index === banners.length - 1 ? 0 : SPACING.md }}
            >
              <Image
                source={{ uri: resolveImageUrl(item.image) }}
                style={{
                  width: Dimensions.get('window').width * 0.85,
                  height: 160,
                  borderRadius: 16,
                }}
                resizeMode="cover"
              />
            </TouchableOpacity>
          ))}
        </ScrollView>
        )}
`;

content = content.replace(/\{\/\* ── Promo Banner Slider ── \*\/\}[\s\S]*?<\/ScrollView>/, newSliderLogic);

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Updated HomeScreen.tsx');
