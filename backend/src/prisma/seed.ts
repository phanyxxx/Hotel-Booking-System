import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // 1. Create Roles
  const roles = await prisma.role.createMany({
    data: [
      { RoleName: 'Admin', Description: 'Full system access' },
      { RoleName: 'Staff', Description: 'Hotel staff access' },
      { RoleName: 'Guest', Description: 'Regular customer' },
    ],
    skipDuplicates: true,
  });
  console.log('✅ Roles created');

  // 2. Get role IDs
  const adminRole = await prisma.role.findUnique({ where: { RoleName: 'Admin' } });
  const staffRole = await prisma.role.findUnique({ where: { RoleName: 'Staff' } });
  const guestRole = await prisma.role.findUnique({ where: { RoleName: 'Guest' } });

  // 3. Create Admin User
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  await prisma.user.upsert({
    where: { Email: 'admin@hotel.com' },
    update: {},
    create: {
      FullName: 'System Administrator',
      Email: 'admin@hotel.com',
      Phone: '012345678',
      Password: hashedPassword,
      RoleID: adminRole!.RoleID,
      Status: 1,
    },
  });
  console.log('✅ Admin user created (email: admin@hotel.com, password: admin123)');

  // 4. Create Sample Hotel
  const hotel = await prisma.hotel.upsert({
    where: { HotelID: 1 },
    update: {},
    create: {
      HotelName: 'Angkor Paradise Hotel',
      Address: 'National Road 6, Siem Reap',
      Location: 'Siem Reap',
      Phone: '063 999 999',
      Email: 'info@angkorparadise.com',
      Description: 'Luxury hotel near Angkor Wat with modern amenities',
      MainImage: '/uploads/hotels/angkor_main.jpg',
      GalleryImages: JSON.stringify([
        '/uploads/hotels/angkor_1.jpg',
        '/uploads/hotels/angkor_2.jpg',
        '/uploads/hotels/angkor_3.jpg'
      ]),
    },
  });
  console.log('✅ Sample hotel created');

  // 5. Create Room Types
  const roomTypes = await prisma.roomType.createMany({
    data: [
      { TypeName: 'Standard', PricePerNight: 50, Description: 'Basic room with city view', MaxOccupancy: '2 Adults' },
      { TypeName: 'Deluxe', PricePerNight: 80, Description: 'Spacious room with balcony', MaxOccupancy: '2 Adults + 1 Child' },
      { TypeName: 'Suite', PricePerNight: 150, Description: 'Luxury suite with living room', MaxOccupancy: '4 Adults' },
      { TypeName: 'Family', PricePerNight: 120, Description: 'Two connecting rooms', MaxOccupancy: '4 Adults + 2 Children' },
    ],
    skipDuplicates: true,
  });
  console.log('✅ Room types created');

  // 6. Get room type IDs
  const standardType = await prisma.roomType.findFirst({ where: { TypeName: 'Standard' } });
  const deluxeType = await prisma.roomType.findFirst({ where: { TypeName: 'Deluxe' } });
  const suiteType = await prisma.roomType.findFirst({ where: { TypeName: 'Suite' } });

  // 7. Create Rooms
  if (standardType && deluxeType && suiteType) {
    const rooms = [];
    
    // Standard rooms (floor 1-3, rooms 101-110)
    for (let i = 1; i <= 10; i++) {
      rooms.push({
        HotelID: hotel.HotelID,
        RoomTypeID: standardType.RoomTypeID,
        RoomNumber: `10${i}`,
        Price: 50,
        Status: 1,
        FloorNumber: Math.floor(i / 4) + 1,
      });
    }
    
    // Deluxe rooms (floor 4-5, rooms 401-410)
    for (let i = 1; i <= 10; i++) {
      rooms.push({
        HotelID: hotel.HotelID,
        RoomTypeID: deluxeType.RoomTypeID,
        RoomNumber: `40${i}`,
        Price: 80,
        Status: 1,
        FloorNumber: 4,
      });
    }
    
    // Suite rooms (floor 6, rooms 601-605)
    for (let i = 1; i <= 5; i++) {
      rooms.push({
        HotelID: hotel.HotelID,
        RoomTypeID: suiteType.RoomTypeID,
        RoomNumber: `60${i}`,
        Price: 150,
        Status: 1,
        FloorNumber: 6,
      });
    }
    
    await prisma.room.createMany({
      data: rooms,
      skipDuplicates: true,
    });
    console.log('✅ Rooms created');
  }

  // 8. Create Sample Services
  await prisma.service.createMany({
    data: [
      { ServiceName: 'Airport Pickup', Price: 25, Description: 'Private car from airport to hotel', Status: 1 },
      { ServiceName: 'Breakfast', Price: 10, Description: 'Buffet breakfast', Status: 1 },
      { ServiceName: 'Laundry', Price: 15, Description: 'Wash and fold service', Status: 1 },
      { ServiceName: 'Spa Massage', Price: 30, Description: '60 minutes traditional massage', Status: 1 },
      { ServiceName: 'Room Service', Price: 5, Description: '24/7 in-room dining delivery', Status: 1 },
      { ServiceName: 'Car Rental', Price: 40, Description: 'Daily car rental with driver', Status: 1 },
    ],
    skipDuplicates: true,
  });
  console.log('✅ Services created');

  console.log('🌱 Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });