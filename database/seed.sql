-- Sample venues data
INSERT INTO public.venues (id, name, description, latitude, longitude, address, contact, hours, cover_image_url) VALUES
(
    '550e8400-e29b-41d4-a716-446655440001',
    'The Underground',
    'Premier nightclub with electronic music and VIP experiences. Dance floor with state-of-the-art sound system.',
    40.7128,
    -74.0060,
    '123 Club Street, Nairobi, Kenya',
    '+254 712345678',
    '{"monday": "closed", "tuesday": "closed", "wednesday": "9pm-2am", "thursday": "9pm-2am", "friday": "9pm-4am", "saturday": "9pm-4am", "sunday": "closed"}',
    'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800'
),
(
    '550e8400-e29b-41d4-a716-446655440002',
    'Rooftop Lounge',
    'Upscale rooftop bar with city views and craft cocktails. Perfect for after-work drinks and weekend parties.',
    40.7589,
    -73.9851,
    '456 Sky Avenue, Nairobi, Kenya',
    '+254 712345678',
    '{"monday": "5pm-12am", "tuesday": "5pm-12am", "wednesday": "5pm-12am", "thursday": "5pm-1am", "friday": "5pm-2am", "saturday": "2pm-2am", "sunday": "2pm-12am"}',
    'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=800'
),
(
    '550e8400-e29b-41d4-a716-446655440003',
    'Neon Nights',
    'Retro-themed club with 80s music and neon lights. Dance to classic hits and modern remixes.',
    40.7505,
    -73.9934,
    '789 Retro Road, Nairobi, Kenya',
    '+254 712345678',
    '{"monday": "closed", "tuesday": "closed", "wednesday": "8pm-2am", "thursday": "8pm-2am", "friday": "8pm-3am", "saturday": "8pm-3am", "sunday": "closed"}',
    'https://images.unsplash.com/photo-1571266028243-d220c6e3c5b1?w=800'
),
(
    '550e8400-e29b-41d4-a716-446655440004',
    'The Basement',
    'Underground hip-hop venue with live performances and DJ sets. Raw energy and authentic vibes.',
    40.7282,
    -73.7949,
    '321 Underground Blvd, Nairobi, Kenya',
    '+254 712345678',
    '{"monday": "closed", "tuesday": "closed", "wednesday": "7pm-1am", "thursday": "7pm-1am", "friday": "7pm-3am", "saturday": "7pm-3am", "sunday": "7pm-12am"}',
    'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800'
),
(
    '550e8400-e29b-41d4-a716-446655440005',
    'Velvet Room',
    'Sophisticated cocktail lounge with live jazz and intimate seating. Perfect for date nights.',
    40.7614,
    -73.9776,
    '654 Jazz Lane, Nairobi, Kenya',
    '+254 712345678',
    '{"monday": "6pm-12am", "tuesday": "6pm-12am", "wednesday": "6pm-1am", "thursday": "6pm-1am", "friday": "6pm-2am", "saturday": "6pm-2am", "sunday": "6pm-11pm"}',
    'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800'
);

-- Sample menus
INSERT INTO public.menus (venue_id, type, content, image_url) VALUES
(
    '550e8400-e29b-41d4-a716-446655440001',
    'drinks',
    '{"cocktails": [{"name": "Electric Blue", "price": "Ksh 150", "description": "Vodka, blue curacao, lime"}, {"name": "Bass Drop", "price": "Ksh 120", "description": "Rum, pineapple, grenadine"}], "shots": [{"name": "Neon Shot", "price": "Ksh 80"}, {"name": "Club Special", "price": "Ksh 100"}]}',
    null
),
(
    '550e8400-e29b-41d4-a716-446655440002',
    'drinks',
    '{"signature_cocktails": [{"name": "Skyline Martini", "price": "Ksh 180", "description": "Premium gin, dry vermouth, olive"}, {"name": "Rooftop Mule", "price": "Ksh 160", "description": "Vodka, ginger beer, lime"}], "wine": [{"name": "Champagne", "price": "Ksh 250/glass"}, {"name": "Red Wine Selection", "price": "Ksh 120-200/glass"}]}',
    null
),
(
    '550e8400-e29b-41d4-a716-446655440003',
    'drinks',
    '{"retro_cocktails": [{"name": "Miami Vice", "price": "Ksh 140", "description": "Rum, coconut, strawberry"}, {"name": "Blue Hawaii", "price": "Ksh 130", "description": "Rum, blue curacao, pineapple"}], "beer": [{"name": "Craft Beer", "price": "Ksh 80"}, {"name": "Imported Beer", "price": "Ksh 100"}]}',
    null
);

-- Sample promotions
INSERT INTO public.promotions (venue_id, title, description, start_date, end_date, is_active) VALUES
(
    '550e8400-e29b-41d4-a716-446655440001',
    'Friday Night Fever',
    'Half price drinks before 11 PM every Friday. Get the party started early!',
    '2025-01-01',
    '2025-12-31',
    true
),
(
    '550e8400-e29b-41d4-a716-446655440001',
    'Student Night Special',
    '25% off with valid student ID on Wednesdays. Show your student spirit!',
    '2025-01-01',
    '2025-12-31',
    true
),
(
    '550e8400-e29b-41d4-a716-446655440002',
    'Happy Hour',
    'Ksh 5 cocktails and Ksh 3 beers from 5-7 PM Monday through Thursday.',
    '2025-01-01',
    '2025-12-31',
    true
),
(
    '550e8400-e29b-41d4-a716-446655440002',
    'Weekend Brunch',
    'Bottomless mimosas with brunch menu. Saturday and Sunday 11 AM - 3 PM.',
    '2025-01-01',
    '2025-12-31',
    true
),
(
    '550e8400-e29b-41d4-a716-446655440003',
    '80s Theme Night',
    'Dress in 80s attire for free entry and drink specials every Thursday!',
    '2025-01-01',
    '2025-12-31',
    true
),
(
    '550e8400-e29b-41d4-a716-446655440004',
    'Open Mic Monday',
    'Free entry for performers. $2 off drinks for audience members.',
    '2025-01-01',
    '2025-12-31',
    true
),
(
    '550e8400-e29b-41d4-a716-446655440005',
    'Jazz Night Special',
    'Live jazz every Friday and Saturday. No cover charge, premium cocktails.',
    '2025-01-01',
    '2025-12-31',
    true
);

