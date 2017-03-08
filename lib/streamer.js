class Streamer {

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
    this.output = this.ac.createGain();

    // throwaway audio buffer
    this.garbageBuffer = this.ac.createBuffer( 1, 1, 44100 );

    this.startTime   = null;
    this.startOffset = null;

    this.stopped = true;
    this.ready   = false;

    this.output.connect( this.ac.destination );
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
      throw new Error(`asset ${ this.name } not loaded`);
    }

    if ( this.stopped === false ) {
      throw new Error(`stream ${ this.name } is already playing`);
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
      let src = this.ac.createBufferSource();
      src.buffer = this.garbageBuffer;
      src.start( 0 );
      delete this.garbageBuffer;
    }

    this.stopped = false;
    this.startOffset = offset;

    console.info(`streaming ${ this.name } @ ${ offset }s`);

    const next = ( when = 0, offset = 0, output ) => {
      const chunkDuration = Math.min( 10, this.duration - offset );
      this.store.getAudioBuffer( this.name, offset, chunkDuration )
      .then( record => {
        if ( this.stopped || output !== this.output ) {
          return;
        }

        const ab  = record;
        const src = this.ac.createBufferSource();
        const dur = ab.duration;

        if ( when === 0 ) {
          when = this.ac.currentTime;
        }

        if ( this.startTime === null ) {
          this.startTime = when;
        }

        const logtime = ( when - this.ac.currentTime ) * 1000;
        const logstr  = `playing chunk ${ this.name } @ ${ offset }s`;

        this.logtimer = setTimeout( () => console.info( logstr ), logtime );

        src.buffer = ab;
        src.connect( output );
        src.start( when );

        when += dur;
        offset += dur;

        if ( offset >= this.duration ) {
          this.ending = src;
          src.onended = () => this.stop();
          console.info(`end of file ${ this.name }`);
          return;
        }

        const fetchtime = ( when - this.ac.currentTime ) * 1000 - 2000;

        this.fetchtimer = setTimeout(() => {
          console.info(`need chunk ${ this.name } @ ${ offset }s`);
          next( when, offset, output );
        }, fetchtime );
      })
      .catch( err => console.error( err ) );
    };

    next( 0, offset, this.output );

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
    this.output.disconnect();
    this.output = this.ac.createGain();
    this.output.connect( this.ac.destination );

    const elapsed = this.ac.currentTime - this.startTime;

    this.startTime = null;
    this.startOffset += elapsed;

    console.info(`stopping ${ this.name } @ ${ this.startOffset }s`);

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
   * @param  {Number} offset – offset in seconds
   * @return {Number}        – current playback position in seconds
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

  load() {
    console.info(`fetching ${ this.url }`);
    return new Promise( ( resolve, reject ) => {
      const xhr = new XMLHttpRequest();

      xhr.open( 'GET', this.url, true );
      xhr.responseType = 'arraybuffer';

      xhr.onload = () => {
        this.ac.decodeAudioData( xhr.response, ab => {
          this.duration = ab.duration;
          this.store.saveAudioBuffer( this.name, ab ).then( () => {
            console.info(`fetched ${ this.url }`);
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
