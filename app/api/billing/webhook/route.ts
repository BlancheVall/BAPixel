import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe } from "@/lib/billing";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

async function completeCheckoutSession(session: Stripe.Checkout.Session) {
  if (session.payment_status !== "paid") {
    return;
  }

  const purchaseId = session.metadata?.purchaseId;

  if (!purchaseId) {
    throw new Error(`Stripe session ${session.id} is missing purchaseId metadata.`);
  }

  await prisma.$transaction(async (tx) => {
    const purchase = await tx.pointPurchase.findUnique({
      where: {
        id: purchaseId,
      },
    });

    if (!purchase) {
      throw new Error(`Point purchase ${purchaseId} was not found.`);
    }

    if (purchase.status === "PAID") {
      return;
    }

    if (purchase.stripeCheckoutSessionId && purchase.stripeCheckoutSessionId !== session.id) {
      throw new Error(`Point purchase ${purchaseId} belongs to another Stripe session.`);
    }

    if (session.amount_total !== purchase.amountCents || session.currency !== purchase.currency) {
      throw new Error(`Stripe session ${session.id} amount does not match purchase ${purchaseId}.`);
    }

    await tx.pointPurchase.update({
      where: {
        id: purchase.id,
      },
      data: {
        status: "PAID",
        stripeCheckoutSessionId: session.id,
        stripePaymentIntentId:
          typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id,
        completedAt: new Date(),
      },
    });

    await tx.user.update({
      where: {
        id: purchase.userId,
      },
      data: {
        points: {
          increment: purchase.points,
        },
      },
    });

    await tx.pointTransaction.create({
      data: {
        userId: purchase.userId,
        purchaseId: purchase.id,
        amount: purchase.points,
        type: "PURCHASE",
        note: `Stripe checkout ${session.id}`,
      },
    });
  });
}

async function expireCheckoutSession(session: Stripe.Checkout.Session) {
  const purchaseId = session.metadata?.purchaseId;

  if (!purchaseId) {
    return;
  }

  await prisma.pointPurchase.updateMany({
    where: {
      id: purchaseId,
      status: "PENDING",
    },
    data: {
      status: "CANCELED",
      stripeCheckoutSessionId: session.id,
    },
  });
}

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return NextResponse.json({ error: "STRIPE_WEBHOOK_SECRET is not configured." }, { status: 500 });
  }

  const stripe = getStripe();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(await req.text(), signature, webhookSecret);
  } catch (error) {
    console.error(error);

    return NextResponse.json({ error: "Invalid Stripe webhook signature." }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      await completeCheckoutSession(event.data.object as Stripe.Checkout.Session);
    }

    if (event.type === "checkout.session.expired") {
      await expireCheckoutSession(event.data.object as Stripe.Checkout.Session);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error(error);

    return NextResponse.json({ error: "Webhook handling failed." }, { status: 500 });
  }
}
