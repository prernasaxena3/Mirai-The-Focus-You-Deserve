import { currentUser } from "@clerk/nextjs/server";
import { db } from "./prisma";

export const checkUser = async () => {
  const user = await currentUser();

  if (!user) {
    return null;
  }

  try {
    // Find user by Clerk ID
    let loggedInUser = await db.user.findUnique({
      where: {
        clerkUserId: user.id,
      },
    });

    // If user exists → return it
    if (loggedInUser) {
      return loggedInUser;
    }

    // If user does NOT exist by Clerk ID,
    // try to find a user with the same email to avoid unique constraint error
    const existingByEmail = await db.user.findUnique({
      where: { email: user.emailAddresses[0].emailAddress },
    });

    if (existingByEmail) {
      // Link this email to the current Clerk ID
      loggedInUser = await db.user.update({
        where: { email: user.emailAddresses[0].emailAddress },
        data: { clerkUserId: user.id },
      });
      return loggedInUser;
    }

    // Otherwise, create new user
    const name = `${user.firstName || ""} ${user.lastName || ""}`.trim();

    const newUser = await db.user.create({
      data: {
        clerkUserId: user.id,
        name,
        imageUrl: user.imageUrl,
        email: user.emailAddresses[0].emailAddress,
      },
    });

    return newUser;
  } catch (error) {
    console.error("checkUser error:", error.message);
    return null;
  }
};
