<?php

namespace Tests\Fixtures;

class CatalogFeed
{
    public static function categoriesUrl(): string
    {
        return 'https://shop.neotech.ge/data/category.json';
    }

    public static function productsUrl(): string
    {
        return 'https://shop.neotech.ge/data/products.json';
    }

    /**
     * @return list<array<string, mixed>>
     */
    public static function categories(): array
    {
        return [
            ['category_id' => '32', 'parent_id' => '0', 'category' => 'ვიდეო მეთვალყურეობა'],
            ['category_id' => '33', 'parent_id' => '32', 'category' => 'კამერები'],
            ['category_id' => '36', 'parent_id' => '33', 'category' => 'IP კამერები'],
            ['category_id' => '77', 'parent_id' => '0', 'category' => 'სახანძრო სისტემები'],
            ['category_id' => '66', 'parent_id' => '0', 'category' => 'დაშვების სისტემები'],
            ['category_id' => '61', 'parent_id' => '0', 'category' => 'დაცვითი სიგნალიზაცია'],
            ['category_id' => '155', 'parent_id' => '0', 'category' => 'AJAX'],
            ['category_id' => '888', 'parent_id' => '777', 'category' => 'ორფანი'],
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    public static function products(): array
    {
        return [
            self::product('101', '36', 'CAM-101', 'IP camera A', 'Hikvision', '100.00', '1', '**'),
            self::product('102', '36', 'CAM-102', 'IP camera B', 'Hikvision', '150.00', '1', '*'),
            self::product('103', '33', 'CAM-103', 'Analog camera', 'Dahua', '200.00', '1', '***'),
            self::product('104', '77', 'FIRE-104', 'Fire panel', 'Bosch', '300.00', '1', '**', short: '', full: ''),
            self::product('105', '66', 'ACC-105', 'Access reader', 'ZkTeco', '80.00', '1', '*', features: 'not-a-dict'),
            self::product('106', '555', 'MISC-106', 'Missing category item', 'Hikvision', '50.00', '1', '****'),
            self::product('107', '77', 'FIRE-107', 'Out of stock panel', 'Unipos', '400.00', '0', ''),
            self::product('108', '155', 'AJAX-108', 'Ajax hub', 'AJAX', '90.00', '1', '***'),
            self::product('109', '32', 'CAM-109', 'Root camera kit', 'Hikvision', '1000.00', '1', '**'),
            self::product('110', '888', 'BTN-110', 'Orphan button', 'Yli Electronics', '16.00', '1', '*'),
            self::product('111', '61', 'ALM-111', 'Alarm expander', 'Paradox', '220.00', '1', '**'),
            self::product(
                '112',
                '36',
                'CAM-112',
                'HTML camera',
                'Honeywell',
                '75.00',
                '1',
                '**',
                short: '<p>Short <strong>safe</strong></p>',
                full: '<p>Hello</p><script>alert(1)</script><a href="https://example.com">link</a><img src="x" onerror="alert(1)">'
            ),
        ];
    }

    /**
     * @param  array<string, string>|string  $features
     * @return array<string, mixed>
     */
    public static function product(
        string $id,
        string $categoryId,
        string $code,
        string $name,
        string $brand,
        string $price,
        string $inStock,
        string $amount,
        array|string $features = [],
        string $short = '<p>Short</p>',
        string $full = '<p>Full</p>',
    ): array {
        $featureValue = is_array($features)
            ? array_merge(['ბრენდი' => $brand], $features)
            : $features;

        return [
            'category_id' => $categoryId,
            'product_id' => $id,
            'product_code' => $code,
            'product' => $name,
            'short_description' => $short,
            'full_description' => $full,
            'amount' => $amount,
            'in_stock' => $inStock,
            'price' => $price,
            'features' => $featureValue,
            'images' => [
                'https://shop.neotech.ge/images/'.$id.'-a.png',
                'https://shop.neotech.ge/images/'.$id.'-b.png',
            ],
        ];
    }
}
