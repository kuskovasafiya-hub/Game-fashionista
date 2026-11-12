import { render } from 'preact';
import { App } from './ui/App';
import '@fontsource-variable/nunito';
import './styles.css';

render(<App />, document.getElementById('app')!);
