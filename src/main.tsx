import { render } from 'preact';
import { App } from './ui/App';
import { initAudio } from './game/sound';
import '@fontsource-variable/nunito';
import './styles.css';
import './desktop.css';

initAudio();
render(<App />, document.getElementById('app')!);
