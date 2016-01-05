import isArray from '../../util/isArray';
import isVoid from '../../util/isVoid';
import appendText from '../../util/appendText';
import recreateNode from '../recreateNode';
import isStringOrNumber from '../../util/isStringOrNumber';
import { getValueWithIndex, removeValueTree } from '../../core/variables';
import { updateKeyed, updateNonKeyed } from '../domMutate';
import { addDOMDynamicAttributes, updateDOMDynamicAttributes } from '../addAttributes';

export default function createNodeWithDynamicChild( templateNode, valueIndex, dynamicAttrs ) {
	let domNode;
	let keyedChildren = true;
	const childNodeList = [];
	const node = {
		overrideItem: null,
		create( item, treeLifecycle, context ) {
			domNode = templateNode.cloneNode( false );
			const value = getValueWithIndex( item, valueIndex );

			if ( !isVoid( value ) ) {
				if ( isArray( value ) ) {
					for ( let i = 0; i < value.length; i++ ) {
						const childItem = value[i];
						// catches edge case where we e.g. have [null, null, null] as a starting point
						if ( !isVoid( childItem ) && typeof childItem === 'object' ) {

							const tree = childItem && childItem.tree;

							if ( tree ) {
								const childNode = childItem.tree.dom.create( childItem, treeLifecycle, context );

								if ( childItem.key === undefined ) {
									keyedChildren = false;
								}
								childNodeList.push( childNode );
								domNode.appendChild( childNode );
							}
						} else if ( isStringOrNumber( childItem ) ) {
							const textNode = document.createTextNode( childItem );

							domNode.appendChild( textNode );
							childNodeList.push( textNode );
							keyedChildren = false;
						}
					}
				} else if ( typeof value === 'object' ) {

					const tree = value && value.tree;

					if ( tree ) {
						domNode.appendChild( value.tree.dom.create( value, treeLifecycle, context ) );
					}
				} else if ( isStringOrNumber( value ) ) {
					domNode.textContent = value;
				}
			}
			if ( dynamicAttrs ) {
				addDOMDynamicAttributes( item, domNode, dynamicAttrs, null );
			}
			return domNode;
		},
		update( lastItem, nextItem, treeLifecycle, context ) {
			const nextValue = getValueWithIndex( nextItem, valueIndex );
			const lastValue = getValueWithIndex( lastItem, valueIndex );

			if ( nextValue && isVoid( lastValue ) ) {

				if ( typeof nextValue === 'object' ) {
					if ( isArray( nextValue ) ) {
						for ( let i = 0; i < nextValue.length; i++ ) {
							if ( isStringOrNumber( nextValue[i] ) ) {
								domNode.appendChild( document.createTextNode( nextValue[i] ) );
							} else {
								// Do nothing for now
							}
						}
					} else {
						recreateNode( lastItem, nextItem, node, treeLifecycle, context );
					}

				} else {
					domNode.appendChild( document.createTextNode( nextValue ) );
				}
			} else 	if ( lastValue && isVoid( nextValue ) ) {

				if ( isArray( lastValue ) ) {

					for ( let i = 0; i < lastValue.length; i++ ) {

						if ( !isVoid( domNode.childNodes[i] ) ) {
							domNode.removeChild( domNode.childNodes[i] );
						} else {

							const firstChild = domNode.firstChild;

							if ( firstChild ) {
								domNode.removeChild( domNode.firstChild );
							}
						}
					}
				} else {

					const firstChild = domNode.firstChild;

					if ( firstChild ) {
						domNode.removeChild( domNode.firstChild );
					}
				}
			} else if ( nextValue !== lastValue ) {
				if ( typeof nextValue === 'string' ) {
					appendText( domNode, nextValue );
				} else if ( isVoid( nextValue ) ) {
					const firstChild = domNode.firstChild;

					if ( firstChild ) {
						domNode.removeChild( domNode.firstChild );
					}
					// if we update from undefined, we will have an array with zero length.
					// If we check if it's an array, it will throw 'x' is undefined.
				} else if ( nextValue.length !== 0 && isArray( nextValue ) ) {
					if ( lastValue && isArray( lastValue ) ) {
						if ( keyedChildren ) {
							updateKeyed( nextValue, lastValue, domNode, null, treeLifecycle, context );
						} else {
							updateNonKeyed( nextValue, lastValue, childNodeList, domNode, null, treeLifecycle, context );
						}
					} else {
						// lastValue is undefined, so set it to an empty array and update
						updateNonKeyed( nextValue, [], childNodeList, domNode, null, treeLifecycle, context);
					}
				} else if ( typeof nextValue === 'object' ) {

					// Sometimes 'nextValue' can be an empty array or nothing at all, then it will
					// throw ': nextValue.tree is undefined'.
					const tree = nextValue && nextValue.tree;

					if ( !isVoid( tree ) ) {

						// If we update from 'null', there will be no 'tree', and the code will throw.
						const tree = lastValue && lastValue.tree;

						if ( !isVoid( tree ) ) {
							tree.dom.update( lastValue, nextValue, treeLifecycle, context );
						} else {
							// TODO implement
							// NOTE There will be no 'tree' if we update from a null value
						}
					} else {
						// Edge case! If we update from e.g object literal - {} - from a existing value, the
						// value will not be unset

						const firstChild = domNode.firstChild;

						if ( firstChild ) {
							domNode.removeChild( domNode.firstChild );
						}
					}
				} else if ( isStringOrNumber( nextValue ) ) {
					appendText( domNode, nextValue );
				}
			}
			if ( dynamicAttrs ) {
				updateDOMDynamicAttributes( lastItem, nextItem, domNode, dynamicAttrs );
			}
		},
		remove( item, treeLifecycle ) {
			const value = getValueWithIndex( item, valueIndex );

			removeValueTree( value, treeLifecycle );
		}
	};

	return node;
}
