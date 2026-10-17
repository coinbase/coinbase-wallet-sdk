import '@testing-library/jest-dom';
import indexeddb from 'fake-indexeddb';

globalThis.indexedDB = indexeddb;
