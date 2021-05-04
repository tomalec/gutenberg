/**
 * External dependencies
 */
// eslint-disable-next-line no-restricted-imports
import type * as React from 'react';
import type { As, RenderProp, ExtractHTMLAttributes } from 'reakit-utils/types';

/**
 * Based on https://github.com/reakit/reakit/blob/master/packages/reakit-utils/src/types.ts
 */
export type ViewOwnProps< P, T extends As > = P &
	Omit< React.ComponentPropsWithRef< T >, 'as' | keyof P > & {
		as?: T | keyof JSX.IntrinsicElements;
		children?: React.ReactNode | RenderProp< ExtractHTMLAttributes< any > >;
	};

export type ElementTypeFromViewOwnProps< P > = P extends ViewOwnProps<
	unknown,
	infer T
>
	? T
	: never;

export type PropsFromViewOwnProps< P > = P extends ViewOwnProps< infer PP, any >
	? PP
	: never;

export type PolymorphicComponent< T extends As, O > = {
	< TT extends As >(
		props: ViewOwnProps< O, TT > & { as: TT }
	): JSX.Element | null;
	( props: ViewOwnProps< O, T > ): JSX.Element | null;
	displayName?: string;
	selector: string;
};

export type ForwardedRef< TElement extends HTMLElement > =
	| ( ( instance: TElement | null ) => void )
	| React.MutableRefObject< TElement | null >
	| null;
