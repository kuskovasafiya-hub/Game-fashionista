import { render } from 'preact';
import { App } from './ui/App';
import { initAudio } from './game/sound';
import { hideLoaderWhenReady } from './loader';
import '@fontsource-variable/nunito';
import './styles.css';
import './desktop.css';

initAudio();
const root = document.getElementById('app')!;
render(<App />, root);
hideLoaderWhenReady(root);
