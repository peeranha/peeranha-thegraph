import { Bet, Player } from './schema';
import { Peeranha } from './contracts/Peeranha.sol';

export function handleNewBet(event: Peeranha): void {
  let player = Player.load(
    event.transaction.from.toHex()
  );

  if (player == null) {
    // create if doesn't exist yet
    player = new Player(event.transaction.from.toHex());
    player.bets = new Array<string>(0);
    player.totalPlayedCount = 0;
    player.hasWonCount = 0;
    player.hasLostCount = 0;
  }

  let bet = new Bet(
    event.transaction.hash.toHex()
        + '-'
        + event.logIndex.toString()
  );
  bet.player = player.id;
  bet.playerHasWon = event.params.hasWon;
  bet.time = event.block.timestamp;
  bet.save();

  player.totalPlayedCount++;
  if (event.params.hasWon) {
    player.hasWonCount++;
  } else {
    player.hasLostCount++;
  }

  // update array like this
  let bets = player.bets;
  bets.push(bet.id);
  player.bets = bets;

  player.save();
}