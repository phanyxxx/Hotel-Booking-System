-- CreateTable
CREATE TABLE "tblRoles" (
    "RoleID" SERIAL NOT NULL,
    "RoleName" VARCHAR(50) NOT NULL,
    "Description" TEXT,

    CONSTRAINT "tblRoles_pkey" PRIMARY KEY ("RoleID")
);

-- CreateTable
CREATE TABLE "tblUsers" (
    "UserID" SERIAL NOT NULL,
    "FullName" VARCHAR(225) NOT NULL,
    "Email" VARCHAR(225) NOT NULL,
    "Phone" VARCHAR(17),
    "Password" VARCHAR(100) NOT NULL,
    "RoleID" INTEGER NOT NULL,
    "PassportOrId" VARCHAR(225),
    "Status" INTEGER NOT NULL DEFAULT 1,
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tblUsers_pkey" PRIMARY KEY ("UserID")
);

-- CreateTable
CREATE TABLE "tblHotels" (
    "HotelID" SERIAL NOT NULL,
    "HotelName" VARCHAR(100) NOT NULL,
    "Address" TEXT NOT NULL,
    "Location" VARCHAR(100) NOT NULL,
    "Phone" VARCHAR(15) NOT NULL,
    "Email" VARCHAR(225),
    "Description" TEXT,
    "MainImage" VARCHAR(500),
    "GalleryImages" TEXT,
    "LogoImage" VARCHAR(500),
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tblHotels_pkey" PRIMARY KEY ("HotelID")
);

-- CreateTable
CREATE TABLE "tblRoomTypes" (
    "RoomTypeID" SERIAL NOT NULL,
    "TypeName" VARCHAR(50) NOT NULL,
    "PricePerNight" DOUBLE PRECISION NOT NULL,
    "Description" TEXT,
    "MaxOccupancy" VARCHAR(30),

    CONSTRAINT "tblRoomTypes_pkey" PRIMARY KEY ("RoomTypeID")
);

-- CreateTable
CREATE TABLE "tblRooms" (
    "RoomID" SERIAL NOT NULL,
    "HotelID" INTEGER NOT NULL,
    "RoomTypeID" INTEGER NOT NULL,
    "RoomNumber" VARCHAR(10) NOT NULL,
    "Price" DOUBLE PRECISION NOT NULL,
    "Status" INTEGER NOT NULL DEFAULT 1,
    "FloorNumber" INTEGER,
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tblRooms_pkey" PRIMARY KEY ("RoomID")
);

-- CreateTable
CREATE TABLE "tblBookings" (
    "BookingID" SERIAL NOT NULL,
    "UserID" INTEGER NOT NULL,
    "BookingDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "CheckInDate" TIMESTAMP(3) NOT NULL,
    "CheckOutDate" TIMESTAMP(3) NOT NULL,
    "Status" INTEGER NOT NULL DEFAULT 1,
    "TotalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tblBookings_pkey" PRIMARY KEY ("BookingID")
);

-- CreateTable
CREATE TABLE "tblBookingDetails" (
    "BookingDetailID" SERIAL NOT NULL,
    "BookingID" INTEGER NOT NULL,
    "RoomID" INTEGER NOT NULL,
    "CheckInDate" TIMESTAMP(3) NOT NULL,
    "CheckOutDate" TIMESTAMP(3) NOT NULL,
    "PricePerRoom" DOUBLE PRECISION NOT NULL,
    "SubTotal" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "tblBookingDetails_pkey" PRIMARY KEY ("BookingDetailID")
);

-- CreateTable
CREATE TABLE "tblPayments" (
    "PaymentID" SERIAL NOT NULL,
    "BookingID" INTEGER NOT NULL,
    "Amount" DOUBLE PRECISION NOT NULL,
    "PaymentMethod" VARCHAR(50) NOT NULL,
    "PaymentStatus" INTEGER NOT NULL DEFAULT 1,
    "PaymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "TransactionReference" VARCHAR(255),

    CONSTRAINT "tblPayments_pkey" PRIMARY KEY ("PaymentID")
);

-- CreateTable
CREATE TABLE "tblServices" (
    "ServiceID" SERIAL NOT NULL,
    "ServiceName" VARCHAR(100) NOT NULL,
    "Price" DOUBLE PRECISION NOT NULL,
    "Description" TEXT,
    "Status" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "tblServices_pkey" PRIMARY KEY ("ServiceID")
);

-- CreateTable
CREATE TABLE "tblBookingServices" (
    "BookingServiceID" SERIAL NOT NULL,
    "BookingID" INTEGER NOT NULL,
    "ServiceID" INTEGER NOT NULL,
    "Quantity" INTEGER NOT NULL DEFAULT 1,
    "Price" DOUBLE PRECISION NOT NULL,
    "SubTotal" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "tblBookingServices_pkey" PRIMARY KEY ("BookingServiceID")
);

-- CreateTable
CREATE TABLE "tblNotifications" (
    "NotificationID" SERIAL NOT NULL,
    "UserID" INTEGER NOT NULL,
    "BookingID" INTEGER,
    "Title" VARCHAR(255) NOT NULL,
    "Message" TEXT NOT NULL,
    "Type" VARCHAR(50) NOT NULL DEFAULT 'app',
    "IsRead" BOOLEAN NOT NULL DEFAULT false,
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tblNotifications_pkey" PRIMARY KEY ("NotificationID")
);

-- CreateTable
CREATE TABLE "tblReviews" (
    "ReviewID" SERIAL NOT NULL,
    "UserID" INTEGER NOT NULL,
    "HotelID" INTEGER NOT NULL,
    "Rating" INTEGER NOT NULL,
    "Comment" TEXT,
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tblReviews_pkey" PRIMARY KEY ("ReviewID")
);

-- CreateIndex
CREATE UNIQUE INDEX "tblRoles_RoleName_key" ON "tblRoles"("RoleName");

-- CreateIndex
CREATE UNIQUE INDEX "tblUsers_Email_key" ON "tblUsers"("Email");

-- CreateIndex
CREATE UNIQUE INDEX "tblRooms_HotelID_RoomNumber_key" ON "tblRooms"("HotelID", "RoomNumber");

-- CreateIndex
CREATE INDEX "tblBookings_UserID_idx" ON "tblBookings"("UserID");

-- CreateIndex
CREATE INDEX "tblBookings_Status_idx" ON "tblBookings"("Status");

-- CreateIndex
CREATE INDEX "tblBookings_CheckInDate_idx" ON "tblBookings"("CheckInDate");

-- CreateIndex
CREATE UNIQUE INDEX "tblBookingDetails_BookingID_RoomID_key" ON "tblBookingDetails"("BookingID", "RoomID");

-- CreateIndex
CREATE INDEX "tblPayments_BookingID_idx" ON "tblPayments"("BookingID");

-- CreateIndex
CREATE INDEX "tblPayments_PaymentStatus_idx" ON "tblPayments"("PaymentStatus");

-- CreateIndex
CREATE UNIQUE INDEX "tblBookingServices_BookingID_ServiceID_key" ON "tblBookingServices"("BookingID", "ServiceID");

-- CreateIndex
CREATE INDEX "tblNotifications_UserID_idx" ON "tblNotifications"("UserID");

-- CreateIndex
CREATE INDEX "tblNotifications_IsRead_idx" ON "tblNotifications"("IsRead");

-- CreateIndex
CREATE INDEX "tblNotifications_CreatedAt_idx" ON "tblNotifications"("CreatedAt");

-- CreateIndex
CREATE INDEX "tblReviews_HotelID_idx" ON "tblReviews"("HotelID");

-- CreateIndex
CREATE INDEX "tblReviews_Rating_idx" ON "tblReviews"("Rating");

-- CreateIndex
CREATE UNIQUE INDEX "tblReviews_UserID_HotelID_key" ON "tblReviews"("UserID", "HotelID");

-- AddForeignKey
ALTER TABLE "tblUsers" ADD CONSTRAINT "tblUsers_RoleID_fkey" FOREIGN KEY ("RoleID") REFERENCES "tblRoles"("RoleID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tblRooms" ADD CONSTRAINT "tblRooms_HotelID_fkey" FOREIGN KEY ("HotelID") REFERENCES "tblHotels"("HotelID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tblRooms" ADD CONSTRAINT "tblRooms_RoomTypeID_fkey" FOREIGN KEY ("RoomTypeID") REFERENCES "tblRoomTypes"("RoomTypeID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tblBookings" ADD CONSTRAINT "tblBookings_UserID_fkey" FOREIGN KEY ("UserID") REFERENCES "tblUsers"("UserID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tblBookingDetails" ADD CONSTRAINT "tblBookingDetails_BookingID_fkey" FOREIGN KEY ("BookingID") REFERENCES "tblBookings"("BookingID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tblBookingDetails" ADD CONSTRAINT "tblBookingDetails_RoomID_fkey" FOREIGN KEY ("RoomID") REFERENCES "tblRooms"("RoomID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tblPayments" ADD CONSTRAINT "tblPayments_BookingID_fkey" FOREIGN KEY ("BookingID") REFERENCES "tblBookings"("BookingID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tblBookingServices" ADD CONSTRAINT "tblBookingServices_BookingID_fkey" FOREIGN KEY ("BookingID") REFERENCES "tblBookings"("BookingID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tblBookingServices" ADD CONSTRAINT "tblBookingServices_ServiceID_fkey" FOREIGN KEY ("ServiceID") REFERENCES "tblServices"("ServiceID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tblNotifications" ADD CONSTRAINT "tblNotifications_UserID_fkey" FOREIGN KEY ("UserID") REFERENCES "tblUsers"("UserID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tblNotifications" ADD CONSTRAINT "tblNotifications_BookingID_fkey" FOREIGN KEY ("BookingID") REFERENCES "tblBookings"("BookingID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tblReviews" ADD CONSTRAINT "tblReviews_UserID_fkey" FOREIGN KEY ("UserID") REFERENCES "tblUsers"("UserID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tblReviews" ADD CONSTRAINT "tblReviews_HotelID_fkey" FOREIGN KEY ("HotelID") REFERENCES "tblHotels"("HotelID") ON DELETE RESTRICT ON UPDATE CASCADE;
