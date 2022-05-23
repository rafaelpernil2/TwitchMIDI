import React from "react";
import styles from './styles.module.css';

export default function Logo(): JSX.Element {
    const Svg = require('@site/static/img/logo.svg').default as React.ComponentType<React.ComponentProps<'svg'>>;
    return (<Svg className={styles.featureSvg} role="img" />);
}