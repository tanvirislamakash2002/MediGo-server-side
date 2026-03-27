import { prisma } from "../lib/prisma";


async function migrateSellers() {
    try {
        // Find all users with SELLER role that don't have a Seller record
        const sellers = await prisma.user.findMany({
            where: {
                role: "SELLER",
                seller: null 
            }
        });

        console.log(`Found ${sellers.length} sellers to migrate`);

        // Create Seller records for each
        for (const user of sellers) {
            await prisma.seller.create({
                data: {
                    userId: user.id,
                    storeName: `${user.name}'s Store`,
                    storeDescription: "Welcome to my store",
                    businessHours: {
                        monday: { open: "09:00", close: "18:00", closed: false },
                        tuesday: { open: "09:00", close: "18:00", closed: false },
                        wednesday: { open: "09:00", close: "18:00", closed: false },
                        thursday: { open: "09:00", close: "18:00", closed: false },
                        friday: { open: "09:00", close: "18:00", closed: false },
                        saturday: { open: "10:00", close: "16:00", closed: false },
                        sunday: { closed: true }
                    },
                    shippingSettings: {
                        freeShippingThreshold: 500,
                        shippingFee: 50,
                        estimatedDelivery: "3-5 business days"
                    },
                    returnPolicy: {
                        allowed: true,
                        days: 7,
                        message: "Items can be returned within 7 days of delivery"
                    },
                    notificationPreferences: {
                        email: true,
                        sms: false,
                        newOrder: true,
                        orderUpdate: true,
                        lowStock: true
                    }
                }
            });
            console.log(`Created seller record for ${user.email}`);
        }

        console.log("Migration completed successfully");
    } catch (error) {
        console.error("Migration failed:", error);
    } finally {
        await prisma.$disconnect();
    }
}

migrateSellers();