require('dotenv').config();

const CREDIT_PACK={
    10:10,
    20:20,
    50:50,
    100:100
}

const PLAN_ID={
    UNLIMITED_YEARLY:{
        id:process.env.RAZORPAY_YEARLY_PLAN_ID,
        planName:"Unlimited yearly",
        totalBillingCycleCount:5
    },
    UNLIMITED_MONTHLY:{
        id:process.env.RAZORPAY_MONTHLY_PLAN_ID,
        planName:"Unlimited Monthly",
        totalBillingCycleCount:12
    }
}



module.exports={CREDIT_PACK,PLAN_ID};