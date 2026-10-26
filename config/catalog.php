<?php

return [
    'products_url' => env('NEOTECH_PRODUCTS_URL', 'https://shop.neotech.ge/data/products.json'),
    'categories_url' => env('NEOTECH_CATEGORIES_URL', 'https://shop.neotech.ge/data/category.json'),
    'brand_feature_key' => 'ბრენდი',
    'timeout' => (int) env('NEOTECH_TIMEOUT', 60),
    'nav_featured_ids' => [32, 77, 66, 61, 155, 103, 85, 70],
    'category_parent_overrides' => [
        152 => 77,
        180 => 77,
    ],
    'category_fallbacks' => [
        115 => 77,
        116 => 77,
        78 => 77,
        79 => 77,
        119 => 77,
        233 => 77,
        235 => 77,
        143 => 58,
        151 => 33,
        147 => 33,
        102 => 90,
        220 => 65,
        132 => 61,
        232 => 61,
        154 => 155,
        159 => 155,
        218 => 66,
        164 => 163,
        125 => 85,
    ],
];
