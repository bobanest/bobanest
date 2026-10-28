// Starter training content. Generic on purpose: exact recipes, amounts and times are the owner's,
// so these are meant to be edited in Admin > Staff Guides.
// Body format: "# " heading, "- " bullet, "1. " numbered step, blank line = new paragraph.

export const SHARED_GUIDES = [
  {
    title: 'Welcome and store basics',
    category: 'Start here',
    order: 1,
    body: `# Welcome to the team
Thanks for joining us. This guide covers how we do things. Ask your manager if anything is unclear.

# Before every shift
- Arrive a few minutes early, clocked in at the employee clock page.
- Wash your hands for 20 seconds with soap and water.
- Tie back long hair, wear a clean uniform or apron, no jewelry on hands.
- Phone away from the prep area.

# Customer service
- Greet every customer within a few seconds, even if you are busy.
- Repeat the order back before charging.
- If you are unsure about an allergy question, ask your manager. Never guess.

# Food safety
- Wash hands after touching your face, phone, trash, or money.
- Use clean utensils for each topping. Never reuse a scoop between different items.
- Label and date anything stored. When in doubt, throw it out.`,
  },
  {
    title: 'How to make milk tea',
    category: 'Drinks',
    order: 10,
    body: `Use the exact amounts on your store's recipe card. Do not change quantities on your own.

# Steps
1. Pick the right cup size and add ice if the order is iced.
2. Add the toppings the customer asked for first (tapioca, pudding, jelly).
3. Add the tea base for the flavor ordered.
4. Add milk or creamer and the sweetener to the sugar level requested.
5. Seal with the machine or add a lid, then shake or stir until mixed.
6. Taste-check a new batch of base when you start the shift.
7. Add the straw, label the cup if needed, and hand it over with a smile.

# Common mistakes
- Wrong sugar level: always confirm 100%, 75%, 50%, 25% or 0%.
- Forgetting toppings: check the ticket before sealing.`,
  },
  {
    title: 'How to make fruit tea',
    category: 'Drinks',
    order: 11,
    body: `Use the exact amounts on your store's recipe card.

# Steps
1. Add ice and the fruit pieces, syrup or puree for the flavor ordered.
2. Add the tea base (usually green or black) to the line on the cup or shaker.
3. Add any topping requested (popping boba, jelly, aloe).
4. Shake well until the outside of the shaker is cold, or use the sealing machine.
5. Pour, add the straw, and check that the fruit is not stuck at the bottom.

# Tips
- Fresh fruit: wash and cut at the start of the shift and keep covered and cold.
- Wipe the rim of the cup before handing it over.`,
  },
  {
    title: 'How to make the tea base',
    category: 'Prep',
    order: 20,
    body: `Tea base is brewed fresh and used through the day. Always follow the ratios on the recipe card.

# Steps
1. Heat clean water to the temperature on the card for that tea (black, green, oolong, jasmine).
2. Add the measured tea leaves or tea bags to the brewing container.
3. Steep for the time on the card. Set a timer, do not guess.
4. Strain out the leaves completely.
5. Cool quickly or add ice as directed so it does not turn bitter.
6. Label the container with the tea name, the date and the time it was made.

# Rules
- Never top up an old batch with a new one.
- Throw out tea that has passed the hold time set by your manager.
- Keep the brewing area and filters clean.`,
  },
  {
    title: 'How to cook tapioca pearls',
    category: 'Prep',
    order: 21,
    body: `Cooking time depends on the brand of pearls. Always check the package and your manager's note.

# Steps
1. Bring plenty of water to a full rolling boil.
2. Add the pearls and stir gently so they do not stick to the bottom.
3. Keep boiling until the pearls float, then lower the heat and cook for the time on the package.
4. Turn off the heat, cover, and let them rest for the time on the package.
5. Drain, then rinse briefly with cool water if your manager asks for it.
6. Soak in the brown sugar or syrup mix and keep covered at room temperature, as directed.
7. Write the time they were made on the container.

# Rules
- Pearls are best fresh. Follow your manager's hold time and discard after it.
- Taste a pearl from each batch. They should be soft and chewy with no hard center.
- Wash the pot right away, because cooked starch is hard to remove once it dries.`,
  },
  {
    title: 'How to use the POS',
    category: 'POS',
    order: 30,
    body: `# Taking an order
1. Open the POS and pick the correct store if asked.
2. Tap the drink, then choose size, sugar level, ice level and toppings.
3. Add every item, then check the order on screen.
4. Repeat the order back to the customer.
5. Choose the payment type: card, cash or gift card.
6. Complete the payment and hand over the receipt if wanted.

# Mistakes
- Wrong item: remove it before payment. After payment, ask your manager for a refund or correction.
- Never give a refund or discount without manager approval.

# Online and QR orders
- New online orders show an alert. Open the order, make it, and mark it ready so the customer is notified.

# Cash
- Count change back to the customer out loud.
- Keep large bills under the drawer tray when you can.`,
  },
  {
    title: 'Daily cleaning',
    category: 'Cleaning',
    order: 40,
    body: `# During the shift
- Wipe counters and the register area between rushes.
- Rinse shakers, spoons and scoops after each use.
- Empty trash before it overflows and wash hands after.

# End of day
1. Wash, rinse and sanitize all tools, shakers, pitchers and scoops.
2. Clean the sealing machine and blenders as shown to you.
3. Empty and wash the tea containers, brewing area and filters.
4. Wipe down all counters, shelves, fridge handles and the POS screen.
5. Sweep and mop the floor.
6. Take out the trash and recycling, and put in new liners.
7. Restock cups, lids, straws and napkins for the next day.

# Cleaning products
- Only use the products your manager has approved, in the amounts on the label.
- Never mix cleaning chemicals.`,
  },
];

// Opening and closing differ per store, so one copy is created for each store.
export function storeGuides(location) {
  return [
    {
      title: `Opening checklist - ${location.name}`,
      category: 'Open and close',
      order: 50,
      locations: [location.slug],
      body: `Add this store's specific steps here (alarm code location, key box, lights, and so on). Starter steps:

1. Unlock and turn off the alarm following your manager's instructions.
2. Turn on the lights, signs, music, fridge checks and the TV menu.
3. Check fridge and freezer temperatures. Tell your manager if anything is off.
4. Turn on the POS, the printer and the sealing machine. Clock in.
5. Brew the tea bases and cook the first batch of tapioca.
6. Prepare fruit, syrups, toppings and stock the stations.
7. Clean and stock cups, lids, straws and napkins.
8. Do a test order on the POS.
9. Turn the sign to open at the posted time.`,
    },
    {
      title: `Closing checklist - ${location.name}`,
      category: 'Open and close',
      order: 51,
      locations: [location.slug],
      body: `Add this store's specific steps here (cash drop, safe, alarm, lock-up). Starter steps:

1. Stop taking new orders at the posted closing time and finish the ones in progress.
2. Discard any tapioca and tea that is past its hold time.
3. Cover, label and date everything that is kept for tomorrow.
4. Complete the end of day cleaning.
5. Close the POS shift, count the drawer and follow your manager's cash instructions.
6. Check that all machines are turned off or in the correct overnight mode.
7. Take out the trash.
8. Turn off the lights and the sign, and set the alarm.
9. Lock all doors and check that they are locked.`,
    },
  ];
}
