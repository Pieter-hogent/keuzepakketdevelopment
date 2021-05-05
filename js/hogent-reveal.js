// initialization for every slide deck
import { CodeStepper } from '../plugin/codestepper/codestepper.js';
import { SvgStepper } from '../plugin/codestepper/svgstepper.js';
SectionHider.initialize();
CodeStepper.initialize();
Reveal.initialize({
	backgroundTransition: 'slide',
	controls: false,
	slideNumber: true,
	width: '100%',
	height: '100%',
	math: {
		mathjax: 'https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.0/MathJax.js',
		config: 'TeX-AMS_HTML-full', // See http://docs.mathjax.org/en/latest/config-files.html
		// pass other options into `MathJax.Hub.Config()`
		// TeX: { Macros: macros }
	},

	plugins: [RevealHighlight, RevealMath, SvgStepper],
	highlight: {
		tabReplace: '  ',
	},
	dependencies: [
		// { src: 'plugin/codestepper/svgstepper.js' },
		{
			src: 'plugin/hogent-style.js',
			callback: () => hogentStyle.initialize(),
		},
		{
			src: 'plugin/chart.xkcd/chart.xkcd.js',
		},
	],
}).then(() => {
	if (
		document.querySelector('script[data-start-at-last]').dataset.startAtLast ===
		'true'
	) {
		Reveal.slide(Reveal.getTotalSlides());
	}
});
