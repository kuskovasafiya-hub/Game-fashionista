import { render } from 'preact';
import { Doll, type Look, type Outfit } from './art/Doll';
import { ITEMS } from './game/catalog';
import { ItemCard } from './ui/common';
import './styles.css';

const looks: [Look, Outfit][] = [
  // from the reference photo art-src/ref/outfit-1.png
  [{ hair: 0, skin: 1, makeup: 0 }, { top: 'city-top-crochet-1', bottom: 'city-bottom-baggy-1', shoes: 'starter-shoes-sneakers-1', glasses: 'city-acc-sunglasses-1', necklace: 'glam-acc-chain-1' }],
  [{ hair: 1, skin: 4, makeup: 1 }, { top: 'city-top-crochet-1', bottom: 'city-bottom-baggy-1', shoes: 'starter-shoes-sneakers-1', glasses: 'city-acc-glasses-1', earrings: 'starter-acc-hoops-1' }],
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
  // batch 1: both colours of each new piece, on fair and deep skin
  [{ hair: 0, skin: 0, makeup: 0 }, { dress: 'city-dress-wrap-1', shoes: 'city-shoes-flats-1' }],
  [{ hair: 1, skin: 4, makeup: 1 }, { dress: 'city-dress-wrap-2', shoes: 'city-shoes-flats-2' }],
  [{ hair: 2, skin: 0, makeup: 2 }, { top: 'starter-top-tee-1', bottom: 'city-bottom-shorts-1', shoes: 'city-shoes-slipons-1' }],
  [{ hair: 3, skin: 4, makeup: 0 }, { top: 'starter-top-tee-1', bottom: 'city-bottom-shorts-1', shoes: 'city-shoes-slipons-2' }],
  [{ hair: 4, skin: 0, makeup: 3 }, { top: 'city-top-sweater-1', bottom: 'starter-bottom-skirt-1', shoes: 'city-shoes-ankleboots-1' }],
  [{ hair: 5, skin: 4, makeup: 1 }, { top: 'city-top-sweater-1', bottom: 'starter-bottom-skirt-1', shoes: 'city-shoes-ankleboots-2' }],
  [{ hair: 2, skin: 0, makeup: 0 }, { dress: 'office-dress-sheath-1', shoes: 'office-shoes-pumps-1', earrings: 'office-acc-studs-pearl-1' }],
  [{ hair: 2, skin: 4, makeup: 3 }, { dress: 'office-dress-sheath-2', shoes: 'office-shoes-pumps-2', earrings: 'office-acc-studs-pearl-2' }],
  [{ hair: 6, skin: 0, makeup: 0 }, { dress: 'office-dress-shirt-1', shoes: 'office-shoes-pumps-1' }],
  [{ hair: 0, skin: 4, makeup: 1 }, { dress: 'office-dress-shirt-2', shoes: 'city-shoes-flats-1' }],
  [{ hair: 1, skin: 0, makeup: 2 }, { top: 'evening-top-bustier-1', bottom: 'evening-bottom-satin-1', shoes: 'evening-shoes-mules-1' }],
  [{ hair: 3, skin: 4, makeup: 2 }, { top: 'evening-top-bustier-2', bottom: 'evening-bottom-satin-2', shoes: 'evening-shoes-mules-2' }],
  [{ hair: 4, skin: 0, makeup: 1 }, { top: 'evening-top-sequin-1', bottom: 'evening-bottom-satin-2', shoes: 'office-shoes-pumps-2' }],
  [{ hair: 5, skin: 4, makeup: 3 }, { top: 'evening-top-sequin-2', bottom: 'evening-bottom-midi-1', shoes: 'evening-shoes-mules-1' }],
  // batch 2
  [{ hair: 3, skin: 0, makeup: 0 }, { top: 'sport-top-sporttop-1', bottom: 'sport-bottom-bikers-1', shoes: 'step-shoes-runners-1', bag: 'sport-acc-bag-sport-1' }],
  [{ hair: 3, skin: 4, makeup: 0 }, { top: 'sport-top-sporttop-2', bottom: 'sport-bottom-bikers-2', shoes: 'step-shoes-runners-2', bag: 'sport-acc-bag-sport-2' }],
  [{ hair: 6, skin: 0, makeup: 1 }, { top: 'sport-top-zip-1', bottom: 'sport-bottom-joggers-1', shoes: 'step-shoes-runners-1' }],
  [{ hair: 0, skin: 4, makeup: 1 }, { top: 'sport-top-zip-2', bottom: 'sport-bottom-joggers-2', shoes: 'starter-shoes-sneakers-1' }],
  [{ hair: 4, skin: 0, makeup: 2 }, { top: 'starter-top-tee-1', bottom: 'sport-bottom-tennis-1', shoes: 'city-shoes-slipons-1', bracelet: 'glam-acc-bracelet-bangles-1', necklace: 'glam-acc-neck-pendant-1' }],
  [{ hair: 1, skin: 4, makeup: 2 }, { top: 'sport-top-sporttop-1', bottom: 'sport-bottom-tennis-2', shoes: 'step-shoes-runners-2', bracelet: 'glam-acc-bracelet-bangles-2', necklace: 'glam-acc-neck-pendant-2' }],
  [{ hair: 2, skin: 0, makeup: 3 }, { dress: 'evening-dress-gown-1', shoes: 'evening-shoes-mules-1', earrings: 'glam-acc-ear-drops-1', bracelet: 'glam-acc-bracelet-tennis-1', bag: 'glam-acc-bag-clutch-1' }],
  [{ hair: 2, skin: 4, makeup: 3 }, { dress: 'starter-dress-black-1', shoes: 'starter-shoes-heels-1', earrings: 'glam-acc-ear-drops-2', bracelet: 'glam-acc-bracelet-tennis-2', bag: 'glam-acc-bag-clutch-2' }],
  // batch 3: Премиум
  [{ hair: 5, skin: 0, makeup: 3 }, { dress: 'premium-dress-ballgown-1', earrings: 'premium-acc-ear-chandelier-1', necklace: 'premium-acc-neck-diamond-1' }],
  [{ hair: 2, skin: 4, makeup: 3 }, { dress: 'premium-dress-ballgown-2', earrings: 'premium-acc-ear-chandelier-2', necklace: 'premium-acc-neck-diamond-2' }],
  [{ hair: 1, skin: 0, makeup: 2 }, { dress: 'premium-dress-velvet-1', shoes: 'premium-shoes-velvet-2', bag: 'premium-acc-bag-quilted-2' }],
  [{ hair: 6, skin: 4, makeup: 2 }, { dress: 'premium-dress-velvet-2', shoes: 'premium-shoes-velvet-1', bag: 'premium-acc-bag-quilted-1' }],
  [{ hair: 0, skin: 0, makeup: 1 }, { top: 'premium-top-tweed-1', bottom: 'premium-bottom-leather-2', shoes: 'premium-shoes-boots-riding-1', glasses: 'premium-acc-cateye-1' }],
  [{ hair: 3, skin: 4, makeup: 1 }, { top: 'premium-top-tweed-2', bottom: 'premium-bottom-sequin-2', shoes: 'premium-shoes-velvet-1', glasses: 'premium-acc-cateye-2' }],
  [{ hair: 4, skin: 0, makeup: 0 }, { top: 'premium-top-faux-1', bottom: 'premium-bottom-sequin-1', shoes: 'premium-shoes-boots-riding-2' }],
  [{ hair: 5, skin: 4, makeup: 0 }, { top: 'premium-top-faux-2', bottom: 'premium-bottom-leather-1', shoes: 'premium-shoes-boots-riding-1' }],
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
