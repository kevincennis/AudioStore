export default class Streamer {

  /**
   * streamer constructor
   *
   * @method constructor
   *
   * @param  {String}     url   – audio asset url
   * @param  {AudioStore} store – AudioStore instance
   * @return {Streamer}
   */

  constructor( url, store ) {
    this.ac     = store.ac;
    this.store  = store;
    this.url    = url;
    this.name   = url.split('/').pop().split('.')[ 0 ];
    this.active = this.ac.createGain();
    this.gain   = this.ac.createGain();

    // throwaway audio buffer
    this.garbageBuffer = this.ac.createBuffer( 1, 1, 44100 );

    this.startTime   = null;
    this.startOffset = null;

    this.stopped = true;
    this.ready   = false;

    this.active.connect( this.gain );
    this.gain.connect( this.ac.destination );
  }

  /**
   * Preload a chunk so that a subsequent call to `stream()` can
   * begin immediately without hitting thr database
   *
   * @method prime
   *
   * @param  {Number} offset – offset in seconds (defaults to 0 or last time )
   * @return {Promise}       – resolves with `this` on completion
   */

  async prime( offset ) {
    if ( typeof offset !== 'number' ) {
      offset = this.startOffset !== null ? this.startOffset : 0;
    }

    if ( !this.ready ) {
      throw new Error( `asset ${ this.name } not loaded` );
    }

    if ( offset >= this.duration ) {
      throw new Error( `${ offset } is greater than ${ this.duration }` );
    }

    const store    = this.store;
    const duration = Math.min( 5, this.duration - offset );
    const record   = await store.getAudioBuffer( this.name, offset, duration );
    const src      = this.ac.createBufferSource();

    src.buffer = record;

    this.primed = { offset, src };

    return this;
  }

  /**
   * Begin playback at the supplied offset (or resume playback)
   *
   * @method stream
   *
   * @param  {Number} offset – offset in seconds (defaults to 0 or last time )
   * @return {Streamer}
   */

  stream( offset ) {
    if ( typeof offset !== 'number' ) {
      offset = this.startOffset !== null ? this.startOffset : 0;
    }

    if ( !this.ready ) {
      throw new Error( `asset ${ this.name } not loaded` );
    }

    if ( this.stopped === false ) {
      throw new Error( `stream ${ this.name } is already playing` );
    }

    if ( this.ending ) {
      this.ending.onended = () => {};
      this.ending = null;
    }

    if ( offset >= this.duration ) {
      return this.stop();
    }

    // mobile browsers require the first AudioBuuferSourceNode#start() call
    // to happen in the same call stack as a user interaction.
    //
    // out Promise-based stuff breaks that, so we try to get ourselves onto
    // a good callstack here and play an empty sound if we haven't done
    // so already
    if ( this.garbageBuffer ) {
      const src = this.ac.createBufferSource();
      src.buffer = this.garbageBuffer;
      src.start( 0 );
      delete this.garbageBuffer;
    }

    this.stopped = false;
    this.startOffset = offset;

    console.info( `streaming ${ this.name } @ ${ offset }s` );

    const play = ( src, when, offset, output ) => {
      const logtime = ( when - this.ac.currentTime ) * 1000;
      const logstr  = `playing chunk ${ this.name } @ ${ offset }s`;

      this.logtimer = setTimeout( () => console.info( logstr ), logtime );

      src.connect( output );
      src.start( when );

      const dur = src.buffer.duration;

      when += dur;
      offset += dur;

      if ( offset >= this.duration ) {
        this.ending = src;
        src.onended = () => this.stop();
        console.info( `end of file ${ this.name }` );
        return;
      }

      const fetchtime = ( when - this.ac.currentTime ) * 1000 - 2000;

      this.fetchtimer = setTimeout( () => {
        console.info( `need chunk ${ this.name } @ ${ offset }s` );

        /* eslint-disable no-use-before-define */
        next( when, offset, output );
      }, fetchtime );
    };

    const next = ( when = 0, offset = 0, output ) => {
      const chunkDuration = Math.min( 5, this.duration - offset );
      this.store.getAudioBuffer( this.name, offset, chunkDuration )
      .then( record => {
        if ( this.stopped || output !== this.active ) {
          return;
        }

        const ab  = record;
        const src = this.ac.createBufferSource();

        src.buffer = ab;

        if ( when === 0 ) {
          when = this.ac.currentTime;
        }

        if ( this.startTime === null ) {
          this.startTime = when;
        }

        play( src, when, offset, output );
      })
      .catch( err => console.error( err ) );
    };

    const primed = this.primed;

    delete this.primed;

    if ( primed && primed.offset === offset ) {
      return play( primed.src, this.ac.currentTime, offset, this.active );
    }

    next( 0, offset, this.active );

    return this;
  }

  /**
   * stop all playback
   *
   * @method stop
   *
   * @return {Streamer}
   */

  stop() {
    if ( this.stopped || !this.ready ) {
      return;
    }

    this.stopped = true;
    this.active.disconnect();
    this.active = this.ac.createGain();
    this.active.connect( this.gain );

    const elapsed = this.ac.currentTime - this.startTime;

    this.startTime = null;
    this.startOffset += elapsed;

    console.info( `stopping ${ this.name } @ ${ this.startOffset }s` );

    if ( this.startOffset >= this.duration ) {
      this.startOffset = 0;
    }

    clearTimeout( this.fetchtimer );
    clearTimeout( this.logtimer );

    return this;
  }

  /**
   * return the current cursor position in seconds
   *
   * @method currentTime
   *
   * @return {Number}    – current playback position in seconds
   */

  currentTime() {
    if ( this.stopped ) {
      return this.startOffset;
    }

    const start   = this.startTime || this.ac.currentTime;
    const offset  = this.startOffset || 0;
    const elapsed = this.ac.currentTime - start;

    return offset + elapsed;
  }

  /**
   * set the current cursor position in seconds
   *
   * @method seek
   * @param  {Number}   offset – offset in seconds
   * @return {Streamer}
   */

  seek( offset ) {
    if ( !this.stopped ) {
      this.stop();
      this.stream( offset );
    } else {
      this.startOffset = offset;
    }
  }

  /**
   * load the audio asset at `this.url`
   *
   * @method load
   *
   * @return {Promise} – resolves with `true`
   */

  async load( force = false ) {

    if ( !force ) {
      console.info( `checking cache for ${ this.name }` );

      try {
        const { duration } = await this.store.getMetadata( this.name );
        console.info( `cache hit for ${ this.name }` );
        Object.assign( this, { duration, ready: true } );
        return true;
      } catch {}
    }

    console.info( `fetching ${ this.url }` );

    return new Promise( ( resolve, reject ) => {
      const xhr = new XMLHttpRequest();

      xhr.open( 'GET', this.url, true );
      xhr.responseType = 'arraybuffer';

      xhr.onload = () => {
        this.ac.decodeAudioData( xhr.response, ab => {
          this.store.saveAudioBuffer( this.name, ab ).then( metadata => {
            this.duration = metadata.duration;
            console.info( `fetched ${ this.url }` );
            this.ready = true;
            resolve( true );
          }, reject );
        }, reject );
      };

      xhr.onerror = reject;

      xhr.send();
    });
  }

}
