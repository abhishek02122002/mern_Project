//Step #1 and #7 from the sequence diagram of one time payment flow
const Razorpay = require("razorpay");
const { CREDIT_PACK, PLAN_ID } = require("../constants/paymentsConstants");

require("dotenv").config();
const crypto = require("crypto");
const Users = require("../model/Users");
const { log } = require("console");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const paymentController = {
  createOrder: async (req, res) => {
    try {

      
      const { credit } = req.body;
      console.log("credit",credit);
      
      if (!CREDIT_PACK[credit]) {
        console.log("credit hai",CREDIT_PACK[credit]);
        
        return res.status(400).json({
          message: "Invalid credit value",
        });
      }

      const amount = CREDIT_PACK[credit] * 100; //convert to paisa

      const order = await razorpay.orders.create({
        amount: amount,
        currency: "INR",
        receipt: `receipt_${Date.now()}`,
      });

      return res.json({
        order: order,
      });
    } catch (error) {
      console.log(error);
      res.status(500).json({
        message: "Internal server error",
      });
    }
  },

  verifyOrder: async (req, res) => {
    try {
      const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        credit,
      } = req.body;
      const body = razorpay_order_id + "|" + razorpay_payment_id;

      const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(body.toString())
        .digest("hex");

      if (expectedSignature !== razorpay_signature) {
        return res.status(400).json({
          message: "Signature verification failed",
        });
      }

      const user = await Users.findById({ _id: req.user.id });
      user.credit += Number(credit);
      await user.save();

      res.json({ user: user });
    } catch (error) {
      console.log(error);
      res.status(500).json({
        message: "Internal server error",
      });
    }
  },

  createSubscription: async (req, res) => {
    try {
      const { plan_name } = req.body;

      if (!PLAN_ID[plan_name]) {
        return response.status(400).json({
          message: "Invalid plan name",
        });
      }
      const plan = PLAN_ID[plan_name];

      const subscription = await razorpay.subscriptions.create({
        plan_id: plan.id,
        customer_notify: 1,
        total_count: plan.totalBillingCycleCount,
        notes: {
          userId: request.user.id,
        },
      });

      res.json({ subscription: subscription });
    } catch (error) {
      console.log(error);
      res.status(500).json({
        message: "Internal server error",
      });
    }
  },

  verifySubscription: async (req, res) => {
    try {
      const { subscription_id } = req.body;
      const subscription = await razorpay.subscriptions.fetch(subscription_id);

      const user = await Users.findById({ _id: req.user.id });

      //we will use this entry to prevent user from from subscribing again
      //from the UI while we will wait for activation event from razorpay

      user.subscription = {
        id: subscription_id,
        planId: subscription.plan_id,
        status: subscription.status,
      };

      await user.save();

      response.json({ user: user });
    } catch (error) {
      console.log(error);
      res.status(500).json({
        message: "Internal server error",
      });
    }
  },

  cancelSubscription: async (req, res) => {
    try {
      const { subscription_id } = req.body;

      if (!subscription_id) {
        return res.status(400).json({
          message: "Subscription ID is mandatory",
        });
      }

      const data = await razorpay.subscriptions.cancel(subscription_id);
      res.json({ data: data });
    } catch (error) {
      console.log(error);
      res.status(500).json({
        message: "Internal server error",
      });
    }
  },

  handleWebhookEvent: async (req, res) => {
    try {
      console.log("Received event");

      const signature = req.header["x-razorpay-signature"];
      const body = req.body;

      const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
        .update(body)
        .digest("hex");

      if (expectedSignature !== signature) {
        return res.status(400).send("Invalid signature");
      }

      //in response date is receive in form of epoch(int number  we can convert into time  epoch converter)
      const payload = JSON.parse(body);
      console.log(JSON.stringify(payload, 0, 2));

      const event = payload.event;
      const subscriptionData = payload.payload.subscription.entity;

      const razorpaySubscriptionId = subscriptionData.id;
      const userId = subscriptionData.notes?.userId;

      if (!userId) {
        console.log("User id not found in notes");
        return res.status(400).send("UserId not found in notes");
      }

      let newStatus = "";

      switch (event) {
        case "subscription.activated":
          newStatus = "active";
          break;
        case "subscription.pending":
          newStatus = "pending";
          break;
        case "subscription.cancelled":
          newStatus = "cancelled";
          break;
        case "subscription.completed":
          newStatus = "completed";
          break;

        default:
          console.log("unhandeled event: ", event);
          return res.status(200).send("unhandeled event");
      }

      const user = await Users.findOneAndUpdate(
        { _id: userId },
        {
          $set: {
            "subscription.id": razorpaySubscriptionId,
            "subscription.status": newStatus,
            "subscription:start": subscriptionData.start_at
              ? new Date(subscriptionData.start_at * 1000)
              : null,
            "subscription:end": subscriptionData.end_at
              ? new Date(subscriptionData.end_at * 1000)
              : null,
            "subscription.lastBillDate": subscriptionData.current_start
              ? new Date(subscriptionData.current_start * 1000)
              : null,
            "subscription.nextBillDate": subscriptionData.current_end
              ? new Date(subscriptionData.current_end * 1000)
              : null,
            "subscription.paymentsMade": subscriptionData.paid_count,
            "subscription.paymentsRemaining": subscriptionData.remaining_count,
          },
        },
        { new: true }
      );

      if (!user) {
        console.log("User id is invalid");
        return res.status(400).send("userId is not valid");
      }

      console.log(
        `updated subscription status for user ${user.username} to ${newStatus}`
      );

      return res.status(200).send(`Event processed for user: ${userId}`);
    } catch (error) {
      console.log(error);
      res.status(500).json({
        message: "Internal server error",
      });
    }
  },
};

module.exports = paymentController;
