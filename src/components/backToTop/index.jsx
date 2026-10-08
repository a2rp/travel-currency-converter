import { FaArrowUp } from "react-icons/fa";
import styles from "./styles.module.css";

const BackToTop = ({ visible }) => visible ? <button className={styles.backToTop} onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label="Back to top"><FaArrowUp aria-hidden="true" /></button> : null;

export default BackToTop;
