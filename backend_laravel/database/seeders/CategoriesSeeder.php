<?php

namespace Database\Seeders;

use App\Models\Category;
use Illuminate\Database\Seeder;

class CategoriesSeeder extends Seeder
{
    /**
     * Seed the `categories` table with the 6 default laundry service categories.
     *
     * Run with:
     *   php artisan db:seed --class=CategoriesSeeder
     */
    public function run(): void
    {
        $categories = [
            [
                'name'        => 'Wash & Fold',
                'key'         => 'wash_fold',
                'icon'        => '🧺',
                'color'       => '#D7D9FC',
                'description' => 'Per kg pricing, fresh & clean. We wash, dry, and neatly fold your clothes.',
                'is_active'   => true,
                'sort_order'  => 1,
            ],
            [
                'name'        => 'Wash & Iron',
                'key'         => 'wash_iron',
                'icon'        => '👕',
                'color'       => '#F3DDF0',
                'description' => 'Clothes washed, dried, and professionally ironed. Ready to wear.',
                'is_active'   => true,
                'sort_order'  => 2,
            ],
            [
                'name'        => 'Dry Cleaning',
                'key'         => 'dry_clean',
                'icon'        => '👔',
                'color'       => '#FDE0D3',
                'description' => 'Premium solvent-based cleaning for delicate and special-care fabrics.',
                'is_active'   => true,
                'sort_order'  => 3,
            ],
            [
                'name'        => 'Steam Iron',
                'key'         => 'steam_iron',
                'icon'        => '♨️',
                'color'       => '#FDDFC2',
                'description' => 'High-pressure steam ironing for a wrinkle-free, crisp finish.',
                'is_active'   => true,
                'sort_order'  => 4,
            ],
            [
                'name'        => 'Iron Only',
                'key'         => 'iron_only',
                'icon'        => '🪣',
                'color'       => '#E8F5E9',
                'description' => 'Drop off your clean clothes and we will iron them to perfection.',
                'is_active'   => true,
                'sort_order'  => 5,
            ],
            [
                'name'        => 'Premium Care',
                'key'         => 'premium',
                'icon'        => '✨',
                'color'       => '#FFF3E0',
                'description' => 'White-glove service for your most precious garments. Hand-finished.',
                'is_active'   => true,
                'sort_order'  => 6,
            ],
        ];

        foreach ($categories as $cat) {
            Category::updateOrCreate(
                ['key' => $cat['key']],   // match by unique key
                $cat                       // values to insert/update
            );
        }

        $this->command->info('✅  Categories seeded successfully (' . count($categories) . ' records).');
    }
}
