import { render } from 'preact';
import { Onboarding } from './Onboarding';
import '../../../../packages/ui/src/tokens.css';

render(<Onboarding />, document.getElementById('app')!);
