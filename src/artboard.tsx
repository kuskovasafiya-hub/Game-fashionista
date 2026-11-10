import { render } from 'preact';
import { Doll, type Look, type Outfit } from './art/Doll';
import { ITEMS } from './game/catalog';
import { ItemCard } from './ui/common';
import './styles.css';

const looks: [Look, Outfit][] = [
  [{ hair: 2, skin: 0, makeup: 3 }, { top: 'office-top-blazer-1', bottom: 'office-bottom-trousers-1', shoes: 'office-shoes-loafers-1', necklace: 'office-acc-pearls-1', bag: 'office-acc-tote-1' }],
  [{ hair: 3, skin: 4, makeup: 0 }, { top: 'sport-top-hoodie-1', bottom: 'sport-bottom-leggings-1', shoes: 'starter-shoes-sneakers-1', bag: 'sport-acc-belt-bag-1' }],
  [{ hair: 5, skin: 3, makeup: 1 }, { dress: 'evening-dress-gown-1', shoes: 'step-shoes-sandals-1', earrings: 'starter-acc-hoops-1' }],
  [{ hair: 0, skin: 1, makeup: 3 }, { top: 'city-top-sweater-1', bottom: 'evening-bottom-midi-1', shoes: 'step-shoes-boots-1', necklace: 'glam-acc-chain-1' }],
  [{ hair: 4, skin: 2, makeup: 2 }, { dress: 'city-dress-sundress-1', shoes: 'step-shoes-sandals-1', bag: 'city-acc-bag-1' }],
  [{ hair: 1, skin: 4, makeup: 1 }, { top: 'office-top-blouse-1', bottom: 'starter-bottom-skirt-1', shoes: 'starter-shoes-heels-1', necklace: 'glam-acc-chain-1' }],
  [{ hair: 6, skin: 0, makeup: 2 }, { top: 'starter-top-crop-1', bottom: 'city-bottom-shorts-1', shoes: 'step-shoes-boots-1', earrings: 'starter-acc-hoops-1' }],
  // colour-filtered items over skin: the leg in the slit and the ankles must stay skin
  [{ hair: 5, skin: 2, makeup: 1 }, { dress: 'evening-dress-gown-2', shoes: 'step-shoes-heels-2' }],
  [{ hair: 3, skin: 4, makeup: 3 }, { dress: 'evening-dress-gown-3', shoes: 'step-shoes-heels-1' }],
  [{ hair: 2, skin: 3, makeup: 0 }, { top: 'office-top-blazer-3', bottom: 'starter-bottom-jeans-1', shoes: 'starter-shoes-heels-1' }],
];

function Board() {
  return (
    <div>
      <h2>Образы</h2>
      <div class="row">{looks.map(([l, o]) => <Doll class="board-doll" look={l} outfit={o} />)}</div>
      <h2>Все вещи ({ITEMS.length})</h2>
      <div class="row">
        {ITEMS.map((i) => (
          <div class="board-card"><ItemCard item={i} /><div>{i.name}</div></div>
        ))}
      </div>
    </div>
  );
}

render(<Board />, document.getElementById('app')!);
