const Order = require('../models/Order');
const User = require('../models/User');

const automatePayouts = async () => {
  const completedOrders = await Order.find({ 
    status: 'completed', 
    escrowStatus: 'held' 
  });

  for (const order of completedOrders) {
    const artisanId = order.items[0].seller;
    const payout = order.totalAmount * 0.9;

    await User.findByIdAndUpdate(artisanId, { $inc: { balance: payout } });
    
    order.status = 'delivered';
    order.escrowStatus = 'released';
    await order.save();
    
    console.log(`Automated Payout: KSH ${payout} sent to Artisan ${artisanId}`);
  }
};

// Run this every 10 minutes
setInterval(automatePayouts, 10 * 60 * 1000);