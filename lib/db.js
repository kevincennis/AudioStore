const CREATE_STORES = Symbol('createStores');

class DB {

  /**
   * DB constructor
   *
   * @method constructor
   *
   * @return {DB}
   */

  constructor() {
    this.name    = 'AudioStore';
    this.version = 1;
  }

  /**
   * initialize the database
   *
   * @method init
   *
   * @return {Promise} – resolves with a DB instance
   */

  init() {
    return new Promise( ( resolve, reject ) => {
      const req = window.indexedDB.open( this.name, this.version );

      let exists = true;

      req.onsuccess = ev => {
        if ( exists ) {
          console.info(`database ${ this.name } v${ this.version} exists`);
          this.db = ev.target.result
          resolve( this );
        }
      };

      req.onupgradeneeded = ev => {
        this.db = ev.target.result;

        if ( this.db.version === this.version ) {
          exists = false;
          this[ CREATE_STORES ]( this.db ).then( () => {
            console.info(`database ${ this.name } v${ this.version} created`);
            resolve( this );
          });
        }
      };

      req.onerror = reject;
    });
  }

  /**
   * create database stores
   *
   * @method createStores
   *
   * @param  {IndexedDB} db – IndexedDB instance
   * @return {Promise}      – resolves with IndexedDB instance
   */

  [ CREATE_STORES ]( db ) {
    return new Promise( ( resolve, reject ) => {
      const chunks = db.createObjectStore( 'chunks', { keyPath: 'id' } );
      const meta   = db.createObjectStore( 'metadata', { keyPath: 'name' } );

      chunks.createIndex( 'id', 'id', { unique: true } );
      meta.createIndex( 'name', 'name', { unique: true } );

      function done() {
        console.log('done');
        if ( ++count === 2 ) {
          resolve( db );
        }
      }

      // these share a common transaction, so no need to bind both
      chunks.transaction.oncomplete = () => resolve( db );
      chunks.transaction.onerror = reject;
    });
  }

  /**
   * get a record from the database
   *
   * @method getRecord
   *
   * @param  {String}  storename – the objectStore name
   * @param  {String}  id        – the record's id
   * @return {Promise}            – resolves with a record
   */

  getRecord( storename, id ) {
    return new Promise( ( resolve, reject ) => {
      const transaction = this.db.transaction( storename, 'readwrite' );
      const store       = transaction.objectStore( storename );
      const request     = store.get( id );

      request.onsuccess = ev => resolve( request.result );
      request.onerror = reject;
    });
  }

  /**
   * save an array of records to the database
   *
   * @method saveRecords
   *
   * @param  {String}   storename – the objectStore name
   * @param  {array}    records   – array of records to upsert
   * @return {Promise}            – resolves with `true`
   */

  saveRecords( storename, records ) {
    return new Promise( ( resolve, reject ) => {
      const transaction = this.db.transaction( storename, 'readwrite' );
      const store       = transaction.objectStore( storename );

      records.forEach( record => store.put( record ) );

      transaction.oncomplete = () => resolve( true );
      transaction.onerror = reject;
    });
  }

}
