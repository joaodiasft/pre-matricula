-- CreateEnum
CREATE TYPE "Role" AS ENUM ('STUDENT', 'ADMIN');

-- CreateEnum
CREATE TYPE "EnrollmentStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'WAITING_PAYMENT', 'CONFIRMED', 'WAITLISTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'CONFIRMED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('PIX', 'CARD', 'BOLETO', 'PRESENTIAL');

-- CreateEnum
CREATE TYPE "Objective" AS ENUM ('ENEM', 'UFG_VESTIBULAR', 'REFORCO', 'CONCURSOS');

-- CreateEnum
CREATE TYPE "Level" AS ENUM ('INICIANTE', 'INTERMEDIARIO', 'AVANCADO');

-- CreateEnum
CREATE TYPE "CourseSelectionStatus" AS ENUM ('RESERVED', 'WAITLIST');

-- CreateEnum
CREATE TYPE "CourseModality" AS ENUM ('REDACAO', 'EXATAS', 'MATEMATICA', 'GRAMATICA');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'STUDENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "age" INTEGER,
    "school" TEXT,
    "grade" TEXT,
    "objective" "Objective",
    "level" "Level",
    "hasEnem" BOOLEAN,
    "enemScore" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Course" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "modality" "CourseModality" NOT NULL,
    "description" TEXT NOT NULL,
    "materials" TEXT NOT NULL,
    "audience" TEXT NOT NULL,
    "bonusLimit" INTEGER,
    "bonusAwarded" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseSession" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "weekday" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentPlan" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "months" INTEGER NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "discountPct" DECIMAL(5,2),
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PreEnrollment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "EnrollmentStatus" NOT NULL DEFAULT 'DRAFT',
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paymentMethod" "PaymentMethod",
    "totalAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "registrationFee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "registrationFeeDiscount" BOOLEAN NOT NULL DEFAULT false,
    "objective" "Objective",
    "level" "Level",
    "age" INTEGER,
    "school" TEXT,
    "grade" TEXT,
    "studyGoal" TEXT,
    "hasEnem" BOOLEAN,
    "enemScore" INTEGER,
    "confirmationDate" TIMESTAMP(3),
    "confirmationDay" TIMESTAMP(3),
    "token" TEXT,
    "tokenSequence" INTEGER,
    "promoBonusGranted" BOOLEAN NOT NULL DEFAULT false,
    "hasWaitlist" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PreEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PreEnrollmentCourseSelection" (
    "id" TEXT NOT NULL,
    "preEnrollmentId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "planId" TEXT,
    "status" "CourseSelectionStatus" NOT NULL DEFAULT 'RESERVED',
    "waitlistPosition" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PreEnrollmentCourseSelection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TokenCounter" (
    "id" INTEGER NOT NULL,
    "lastNumber" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TokenCounter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "StudentProfile_userId_key" ON "StudentProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CourseSession_code_key" ON "CourseSession"("code");

-- CreateIndex
CREATE UNIQUE INDEX "PreEnrollment_token_key" ON "PreEnrollment"("token");

-- AddForeignKey
ALTER TABLE "StudentProfile" ADD CONSTRAINT "StudentProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseSession" ADD CONSTRAINT "CourseSession_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentPlan" ADD CONSTRAINT "PaymentPlan_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreEnrollment" ADD CONSTRAINT "PreEnrollment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreEnrollmentCourseSelection" ADD CONSTRAINT "PreEnrollmentCourseSelection_preEnrollmentId_fkey" FOREIGN KEY ("preEnrollmentId") REFERENCES "PreEnrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreEnrollmentCourseSelection" ADD CONSTRAINT "PreEnrollmentCourseSelection_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreEnrollmentCourseSelection" ADD CONSTRAINT "PreEnrollmentCourseSelection_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "CourseSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreEnrollmentCourseSelection" ADD CONSTRAINT "PreEnrollmentCourseSelection_planId_fkey" FOREIGN KEY ("planId") REFERENCES "PaymentPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
