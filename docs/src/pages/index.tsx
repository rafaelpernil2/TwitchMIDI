import React from 'react';
import clsx from 'clsx';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import styles from './index.module.css';
import HomepageFeatures from '@site/src/components/HomepageFeatures';
import Translate, { translate } from "@docusaurus/Translate";
import Logo from "../components/Logo";

function HomepageHeader() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <div className="text--center">
          <Logo />
        </div>
        <h1 className="hero__title">
          <Translate>TwitchMIDI</Translate>
        </h1>
        <p className="hero__subtitle">
          <Translate>Allow your viewers to be part of your musical creations!</Translate>
        </p>
        <div className={styles.buttons}>
          <Link
            className="button button--secondary button--lg"
            href="https://github.com/rafaelpernil2/TwitchMIDI/releases/latest/download/TwitchMIDI.zip">
            <Translate>Download now!</Translate>
          </Link>
          <Link
            className="button button--lg"
            href="https://youtu.be/3JK5JukHRn0">
            <Translate>Or watch a demo</Translate>
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function Home(): JSX.Element {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout
      title={`${siteConfig.title}`}
      description={translate({ message: "Allow your viewers to be part of your musical creations!", description: "Head meta tag" })}>
      <HomepageHeader />
      <main>
        <HomepageFeatures />
      </main>
    </Layout>
  );
}
