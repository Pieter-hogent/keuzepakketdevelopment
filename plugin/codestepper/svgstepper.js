import {
	Range,
	parseCodeExplanations,
	createExplanationDivForIndex,
} from './explanationdiv.js';

const SvgElementState = {
	SETUP: 'SETUP',
	ACTIVATED: 'ACTIVATED',
	DEACTIVATED: 'DEACTIVATED',
};
class SvgElement {
	constructor(el, showRange, { setup, activate, deactivate }) {
		this.svgElement = el;
		this.showRange = showRange;
		this.activate = activate;
		this.deactivate = deactivate;
		setup(this.svgElement);
		this.state = SvgElementState.SETUP;
	}
	update(index) {
		// console.log(`update for index ${index}`);
		if (!this.showRange || this.showRange.includes(index)) {
			if (
				this.state === SvgElementState.SETUP ||
				this.state === SvgElementState.DEACTIVATED
			) {
				this.activate(this.svgElement);
				this.state = SvgElementState.ACTIVATED;
			}
		} else {
			if (this.state === SvgElementState.ACTIVATED) {
				this.deactivate(this.svgElement);
				this.state = SvgElementState.DEACTIVATED;
			}
		}
	}
}

// simply show or hide (hidden on setup)
const showHideActivation = {
	setup: (el) => {
		let anim = el.animate({ opacity: 0.0 }, { duration: 1, fill: 'forwards' });
		anim.commitStyles();
		// simply setting these doesn't work (it doesn't reset opacity set by a previous animation)
		// (all still experimental, no idea what's supposed to happen, bloody annoying to google
		// about these things as well)
		// el.style.opacity = 0.0;
		// el.style['animation-fill-mode'] = 'forwards';
	},
	activate: (el) => {
		let anim = el.animate(
			{ opacity: 1.0 },
			{ duration: 250, easing: 'ease-in-out', fill: 'forwards' }
		);
		anim.commitStyles();
	},
	deactivate: (el) => {
		let anim = el.animate({ opacity: 0.0 }, { duration: 1, fill: 'forwards' });
		anim.commitStyles();
	},
};

// line or paths are 'drawn' animated (using the stroke-trick)
// hidden on setup
// (there's quiet a bit of code to cope with markers as well, they are shown/hidden as needed)
const animateAppear = {
	setup: (el) => {
		const paths = el.querySelectorAll('path, line');
		el.setAttribute('data-appearTime', 0.7);

		paths.forEach((path) => {
			var length = path.getTotalLength();
			// Clear any previous transition
			path.style.transition = path.style.WebkitTransition = 'none';
			// Set up the starting positions
			path.style.strokeDasharray = length + ' ' + length;
			path.style.strokeDashoffset = length;
			path.style['fill-opacity'] = '0';

			let markerStart = path.getAttribute('marker-start');
			if (markerStart) {
				path.setAttribute('data-marker-start', markerStart);
				path.removeAttribute('marker-start');
			}
			let markerEnd = path.getAttribute('marker-end');
			if (markerEnd) {
				path.setAttribute('data-marker-end', markerEnd);
				path.removeAttribute('marker-end');
			}

			// Trigger a layout so styles are calculated & the browser
			// picks up the starting position before animating
			path.getBoundingClientRect();
		});
	},
	activate: (el) => {
		const appearTime = el.getAttribute('data-appearTime') || 0.7;
		console.log(appearTime);
		const paths = el.querySelectorAll('path, line');
		paths.forEach((path) => {
			path.style.transition = path.style.WebkitTransition = `stroke-dashoffset ${appearTime}s ease-in-out`;
			path.style.strokeDashoffset = '0';
			// would probably be better with 'transitionend'-events (But that appears to be a rather hot mess as well)
			// this works for all uses I have, so meh
			let markerEnd = path.getAttribute('data-marker-end');
			if (markerEnd) {
				setTimeout(
					() => path.setAttribute('marker-end', markerEnd),
					appearTime * 1000
				);
			}
			let markerStart = path.getAttribute('data-marker-start');
			if (markerStart) {
				path.setAttribute('marker-start', markerStart);
			}
		});
	},
	deactivate: (el) => {
		const appearTime = el.getAttribute('data-appearTime') || 0.7;

		const paths = el.querySelectorAll('path, line');
		paths.forEach((path) => {
			var length = path.getTotalLength();
			path.style.strokeDashoffset = length;
			path.removeAttribute('marker-end'); // no timeout, should be gone as soon as path starts 'disappearing'
			setTimeout(() => path.removeAttribute('marker-start'), appearTime * 1000);
		});
	},
};

export let SvgStepper = {
	id: 'svgstepper',

	init: (deck) => {
		// if I'd ever feel the need, these could become options somehow
		const highlightFirstAppearanceInCodeBlocks = true;

		let currentIndex = -1;
		let maxIndex = -1;

		let svgElements = new Set();

		// let snap = null; // for now, only one active svg

		// top is readjusted (default Reveal handling of vertically centering falls short if
		// show/hide large portions of the slide)
		let previousTop = -1;
		let currentSection = undefined;
		let currentExplanationDiv = null;
		let explanations = new Map(); // map key is a Range object, value the explanation itself
		function toArray(o) {
			return Array.prototype.slice.call(o);
		}
		function showHighlightCurrentIndex() {
			if (currentIndex > maxIndex) {
				// at the end of our inner navigation, remove all keyboard overrides
				// (and hence, give control back to Reveal)
				Reveal.configure({
					keyboard: {},
					touches: {},
				});
				Reveal.navigateNext();
			} else if (currentIndex <= 0) {
				Reveal.configure({
					keyboard: {},
					touches: {},
				});
				Reveal.navigatePrev();
			} else {
				if (currentExplanationDiv) {
					currentExplanationDiv.remove();
				}
				svgElements.forEach((el) => el.update(currentIndex));
				readjustTopOfCurrentSection();
				currentExplanationDiv = createExplanationDivForIndex(
					currentIndex,
					explanations
				);
				if (currentExplanationDiv) {
					currentSection.appendChild(currentExplanationDiv);
				}
			}
		}

		// these functions will be bound to all the keys
		// which are used to advance a slide (down, right, etc.)
		function innerNavigateNext() {
			currentIndex++;
			showHighlightCurrentIndex();
		}

		function innerNavigatePrevious() {
			currentIndex--;
			showHighlightCurrentIndex();
		}
		// slides are centered vertically by once setting the 'top' style based
		// on the scrollHeight / contentHeight, because I dynamically hide/show
		// elements this scrollHeight changes, but the top is not reapplied,
		// so I look for it here and set it correctly
		function readjustTopOfCurrentSection() {
			while (currentSection && currentSection.tagName != 'SECTION') {
				if (currentSection.parentNode) {
					currentSection = currentSection.parentNode;
				} else {
					currentSection = undefined;
					break;
				}
			}
			const newTop =
				(Reveal.getConfig().height - currentSection.scrollHeight) / 2;
			// only set if more than 30px difference (this is enough to not readjust for
			// one extra line of text in explanation)
			if (
				previousTop < 0 ||
				newTop - previousTop > 30 ||
				previousTop - newTop > 30
			) {
				currentSection.style.top = `${newTop}px`;
				previousTop = newTop;
			} else {
				// console.log(`prev ${previousTop}, new ${newTop}`);
			}
		}
		// Reveal.addEventListener('slidetransitionend', function (event) {
		Reveal.addEventListener('slidechanged', function (event) {
			currentSection = event.currentSlide;
			let needsInnerNavigation = false;
			currentIndex = 1;
			maxIndex = -1;
			explanations = new Map();
			currentExplanationDiv = null;

			let svgEmbedElements = currentSection.querySelectorAll(
				'object[data-svgstep]'
			);
			toArray(svgEmbedElements).forEach((el) => {
				needsInnerNavigation = true;
				svgElements = new Set();
				maxIndex = 2; // set it to something > 1, will be overriden by either codestep, or the ASYNC loading of svg

				const parses = [
					{ prefix: 'svgstep_show_', activator: showHideActivation },
					{ prefix: 'svgstep_animate_', activator: animateAppear },
				];

				console.log(el);
				const svgDoc = el.getSVGDocument();
				console.log(svgDoc);
				parses.forEach((toParse) => {
					let gs = svgDoc.querySelectorAll(`g[id*='${toParse.prefix}']`);
					gs.forEach((item) => {
						let elId = item.id;
						let showStepRange = new Range('');

						let rangeString = elId.substring(toParse.prefix.length);
						showStepRange = new Range(rangeString);
						svgElements.add(
							new SvgElement(item, showStepRange, toParse.activator)
						);
						maxIndex = Math.max(maxIndex, showStepRange.max());
					});
				});

				// showHighlightCurrentIndex();
			});
			const explanationDiv = currentSection.querySelector('div[explanation]');
			console.log(explanationDiv);
			if (explanationDiv) {
				let codeExplanations = parseCodeExplanations(explanationDiv);
				for (const [range, node] of codeExplanations.entries()) {
					explanations.set(range, node);
					// this.usedIndices.merge(range);
					maxIndex = Math.max(maxIndex, range.max());
				}
				// explanationDiv.remove();
				explanationDiv.style.display = 'none';
			}

			if (needsInnerNavigation) {
				showHighlightCurrentIndex();

				// (ab)use the user defined keyboard shortcuts to 'swallow' ->, space etc.
				Reveal.configure({
					keyboard: {
						34: innerNavigateNext,
						78: innerNavigateNext,
						39: innerNavigateNext,
						76: innerNavigateNext,
						40: innerNavigateNext,
						80: innerNavigatePrevious,
						33: innerNavigatePrevious,
						72: innerNavigatePrevious,
						37: innerNavigatePrevious,
						38: innerNavigatePrevious,
					},
					touches: {
						swipeLeft: innerNavigatePrevious,
						swipeRight: innerNavigateNext,
					},
				});
			}
		});
	},
};
