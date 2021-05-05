// if the url contains ?presentation=true then all tags which contain the attribute 'nopres' are removed
// vice versa the 'onlypres' is removed

// so effectively you can create one slidedeck suitable to do a presentation, and with extra pages / parts
// for the students at home

const SectionHider =
	window.SectionHider ||
	(function () {
		return {
			initialize: function () {
				const inPresentationMode = new URLSearchParams(
					window.location.search
				).get('presentation');

				console.log(`in presentation mode ${inPresentationMode}`);
				if (inPresentationMode === 'true') {
					Array.prototype.forEach.call(
						document.querySelectorAll('[nopres]'),
						function (node) {
							node.parentNode.removeChild(node);
						}
					);
				} else {
					Array.prototype.forEach.call(
						document.querySelectorAll('[onlypres]'),
						function (node) {
							node.parentNode.removeChild(node);
						}
					);
				}
			},
		};
	})();
