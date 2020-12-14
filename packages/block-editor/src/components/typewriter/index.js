/**
 * WordPress dependencies
 */
import { useEffect, useRef } from '@wordpress/element';
import { computeCaretRect } from '@wordpress/dom';
import { useSelect } from '@wordpress/data';
import { UP, DOWN, LEFT, RIGHT } from '@wordpress/keycodes';

const isIE = window.navigator.userAgent.indexOf( 'Trident' ) !== -1;
const arrowKeyCodes = new Set( [ UP, DOWN, LEFT, RIGHT ] );
const initialTriggerPercentage = 0.75;

export function useTypewriter( ref ) {
	const hasSelectedBlock = useSelect( ( select ) =>
		select( 'core/block-editor' ).hasSelectedBlock()
	);

	useEffect( () => {
		if ( ! hasSelectedBlock ) {
			return;
		}

		const { ownerDocument } = ref.current;
		const { defaultView } = ownerDocument;

		let scrollResizeRafId;
		let onKeyDownRafId;

		let caretRect;

		function onScrollResize() {
			if ( scrollResizeRafId ) {
				return;
			}

			scrollResizeRafId = defaultView.requestAnimationFrame( () => {
				computeCaretRectangle();
				scrollResizeRafId = null;
			} );
		}

		function onKeyDown( event ) {
			// Ensure the any remaining request is cancelled.
			if ( onKeyDownRafId ) {
				defaultView.cancelAnimationFrame( onKeyDownRafId );
			}

			// Use an animation frame for a smooth result.
			onKeyDownRafId = defaultView.requestAnimationFrame( () => {
				maintainCaretPosition( event );
				onKeyDownRafId = null;
			} );
		}

		/**
		 * Maintains the scroll position after a selection change caused by a
		 * keyboard event.
		 *
		 * @param {KeyboardEvent} event Keyboard event.
		 */
		function maintainCaretPosition( { keyCode } ) {
			if ( ! isSelectionEligibleForScroll() ) {
				return;
			}

			const currentCaretRect = computeCaretRect( defaultView );

			if ( ! currentCaretRect ) {
				return;
			}

			// If for some reason there is no position set to be scrolled to,
			// let this be the position to be scrolled to in the future.
			if ( ! caretRect ) {
				caretRect = currentCaretRect;
				return;
			}

			// Even though enabling the typewriter effect for arrow keys results
			// in a pleasant experience, it may not be the case for everyone,
			// so, for now, let's disable it.
			if ( arrowKeyCodes.has( keyCode ) ) {
				// Reset the caret position to maintain.
				caretRect = currentCaretRect;
				return;
			}

			const diff = currentCaretRect.top - caretRect.top;

			if ( diff === 0 ) {
				return;
			}

			const { scrollY, innerHeight } = defaultView;
			const { top, height } = caretRect;
			const relativeScrollPosition = top / innerHeight;

			// If the scroll position is at the start, the active editable
			// element is the last one, and the caret is positioned within the
			// initial trigger percentage of the page, do not scroll the page.
			// The typewriter effect should not kick in until an empty page has
			// been filled with the initial trigger percentage or the user
			// scrolls intentionally down.
			if (
				scrollY === 0 &&
				relativeScrollPosition < initialTriggerPercentage &&
				isLastEditableNode()
			) {
				// Reset the caret position to maintain.
				caretRect = currentCaretRect;
				return;
			}

			// Abort if the target scroll position would scroll the caret out of
			// view.
			if (
				// The caret is under the lower fold.
				top + height > innerHeight ||
				// The caret is above the upper fold.
				top < 0
			) {
				// Reset the caret position to maintain.
				caretRect = currentCaretRect;
				return;
			}

			defaultView.scrollBy( 0, diff );
		}

		/**
		 * Adds a `selectionchange` listener to reset the scroll position to be
		 * maintained.
		 */
		function addSelectionChangeListener() {
			ownerDocument.addEventListener(
				'selectionchange',
				computeCaretRectOnSelectionChange
			);
		}

		/**
		 * Resets the scroll position to be maintained during a
		 * `selectionchange` event. Also removes the listener, so it acts as a
		 * one-time listener.
		 */
		function computeCaretRectOnSelectionChange() {
			ownerDocument.removeEventListener(
				'selectionchange',
				computeCaretRectOnSelectionChange
			);
			computeCaretRectangle();
		}

		/**
		 * Resets the scroll position to be maintained.
		 */
		function computeCaretRectangle() {
			if ( isSelectionEligibleForScroll() ) {
				caretRect = computeCaretRect( defaultView );
			}
		}

		/**
		 * Checks if the current situation is elegible for scroll:
		 * - There should be one and only one block selected.
		 * - The component must contain the selection.
		 * - The active element must be contenteditable.
		 */
		function isSelectionEligibleForScroll() {
			return (
				ref.current.contains( ownerDocument.activeElement ) &&
				ownerDocument.activeElement.isContentEditable
			);
		}

		function isLastEditableNode() {
			const editableNodes = ref.current.querySelectorAll(
				'[contenteditable="true"]'
			);
			const lastEditableNode = editableNodes[ editableNodes.length - 1 ];
			return lastEditableNode === ownerDocument.activeElement;
		}

		// When the user scrolls or resizes, the scroll position should be
		// reset.
		defaultView.addEventListener( 'scroll', onScrollResize, true );
		defaultView.addEventListener( 'resize', onScrollResize, true );

		ref.current.addEventListener( 'keydown', onKeyDown );
		ref.current.addEventListener( 'keyup', maintainCaretPosition );
		ref.current.addEventListener( 'mousedown', addSelectionChangeListener );
		ref.current.addEventListener(
			'touchstart',
			addSelectionChangeListener
		);

		return () => {
			defaultView.removeEventListener( 'scroll', onScrollResize, true );
			defaultView.removeEventListener( 'resize', onScrollResize, true );

			ref.current.removeEventListener( 'keydown', onKeyDown );
			ref.current.removeEventListener( 'keyup', maintainCaretPosition );
			ref.current.removeEventListener(
				'mousedown',
				addSelectionChangeListener
			);
			ref.current.removeEventListener(
				'touchstart',
				addSelectionChangeListener
			);

			ownerDocument.removeEventListener(
				'selectionchange',
				computeCaretRectOnSelectionChange
			);

			defaultView.cancelAnimationFrame( scrollResizeRafId );
			defaultView.cancelAnimationFrame( onKeyDownRafId );
		};
	}, [ hasSelectedBlock ] );
}

function Typewriter( { children } ) {
	const ref = useRef();
	useTypewriter( ref );
	return (
		<div ref={ ref } className="block-editor__typewriter">
			{ children }
		</div>
	);
}

/**
 * The exported component. The implementation of Typewriter faced technical
 * challenges in Internet Explorer, and is simply skipped, rendering the given
 * props children instead.
 *
 * @type {WPComponent}
 */
const TypewriterOrIEBypass = isIE ? ( props ) => props.children : Typewriter;

/**
 * Ensures that the text selection keeps the same vertical distance from the
 * viewport during keyboard events within this component. The vertical distance
 * can vary. It is the last clicked or scrolled to position.
 */
export default TypewriterOrIEBypass;
