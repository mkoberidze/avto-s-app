<?php

return [
    'products_url' => env('NEOTECH_PRODUCTS_URL', 'https://shop.neotech.ge/data/products.json'),
    'categories_url' => env('NEOTECH_CATEGORIES_URL', 'https://shop.neotech.ge/data/category.json'),
    'brand_feature_key' => 'ბრენდი',
    'timeout' => (int) env('NEOTECH_TIMEOUT', 60),
    'nav_featured_ids' => [32, 77, 66, 61, 155, 103, 85, 70],
];
