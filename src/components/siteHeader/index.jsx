import { FaGithub, FaGlobeAmericas } from "react-icons/fa";
import styles from "./styles.module.css";

const SiteHeader = () => (
    <header className={styles.siteHeader}>
        <a className={styles.brand} href="#top" aria-label="Atlas FX home"><span className={styles.brandIcon}><FaGlobeAmericas aria-hidden="true" /></span><span>atlas <b>fx</b></span></a>
        <nav className={styles.navigation} aria-label="Main navigation"><a href="#converter">Convert</a><a href="#rate-board">Rate board</a></nav>
        <a className={styles.repositoryLink} href="https://github.com/a2rp/travel-currency-converter" target="_blank" rel="noreferrer"><FaGithub aria-hidden="true" /><span>Repository</span></a>
    </header>
);

export default SiteHeader;
