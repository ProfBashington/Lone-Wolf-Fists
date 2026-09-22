// Inspired by "One roll Engine" by Shemetz
// Source: https://github.com/shemetz/one-roll-engine
const SETLENGTH = 10;

export async function effortRoll(diceNumber, data) {
  // Roll the set number of dice
  const rolls = await new Roll(`${diceNumber}d10`).evaluate();

  // Get the raw dice results
  const rollResult = rolls.terms[0].results.map(roll => roll.result);

  // Sort them into groups based on their facing
  const counts = new Array(SETLENGTH).fill(0);
  rollResult.forEach(roll => {
    if(roll < SETLENGTH)
      counts[roll] += 1
    else
      counts[0] += 1
  });
  // Create an object with only the popuated sets present, in order
  const sets = [];
  counts.forEach((rank, facing) => {
    if(rank >= 1){
      let set = new Array(rank).fill(facing);
      sets.push(set)
    }
  });
  // Display these groups as a chat message

  data.content = await foundry.applications.handlebars.renderTemplate(`systems/lone-wolf-fists/templates/chat-messages/effort-roll.hbs`, { sets })
  data.rolls = rolls;
  data.flags = { core: { canPopout: true } };
  return ChatMessage.create(data, { messageMode: game.settings.get('core', 'messageMode') })

}

export async function extractDiceNumber(message, data) {
  const command = message.trim().split(/\s+/);
  const diceNumber = Number(command[1]);
  if (!Number.isInteger(diceNumber) || diceNumber < 1) {
    ui.notifications.error(
      `<div>Your command could not be parsed:</div>
      <div>${message}</div>
      <div>Rolls should look like: /effort 7</div>`
    )
    return;
  }
  
  await effortRoll(diceNumber, data)
  return null;
}
