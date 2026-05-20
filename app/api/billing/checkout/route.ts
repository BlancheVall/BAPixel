import { NextRequest, NextResponse } from "next/server";
import { getBaseUrl, getPointPackage, getStripe } from "@/lib/billing";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function errorResponse(code: string, error: string, status: number) {
  return NextResponse.json({ code, error }, { status });
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);

    if (!user) {
      return errorResponse("BILL-CHECKOUT-AUTH", "Please log in before recharging Points.", 401);
    }

    const body = await req.json();
    const packageId = String(body.packageId || "");
    const pointPackage = getPointPackage(packageId);

    if (!pointPackage) {
      return errorResponse("BILL-CHECKOUT-PACKAGE", "Unknown Point package.", 400);
    }

    const purchase = await prisma.pointPurchase.create({
      data: {
        userId: user.id,
        packageId: pointPackage.id,
        points: pointPackage.points,
        amountCents: pointPackage.amountCents,
        currency: pointPackage.currency,
      },
    });

    const baseUrl = getBaseUrl();
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card", "alipay"],
      customer_email: user.email,
      client_reference_id: user.id,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: pointPackage.currency,
            unit_amount: pointPackage.amountCents,
            product_data: {
              name: `Pixel Sprite ${pointPackage.points} Points`,
              description: "Point credits for AI pixel character generation.",
            },
          },
        },
      ],
      metadata: {
        purchaseId: purchase.id,
        userId: user.id,
        packageId: pointPackage.id,
        points: String(pointPackage.points),
      },
      success_url: `${baseUrl}/?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/?payment=cancel`,
    });

    await prisma.pointPurchase.update({
      where: {
        id: purchase.id,
      },
      data: {
        stripeCheckoutSessionId: session.id,
      },
    });

    return NextResponse.json({
      url: session.url,
    });
  } catch (error) {
    console.error(error);

    return errorResponse("BILL-CHECKOUT-FAILED", "Unable to start checkout.", 500);
  }
}
