# js-closure-abuse
An exploration into closures, and Object.bind()



The code inside the for loop really tripped me up:

    Synth.prototype.sequence = function(queue, bpm, loops){

      // Get BPM delay in milliseconds
      var calculated_bpm = this.calculateBpm(bpm);

      // Play each sound, then wait for the offset
      for(i=0; i < queue.length; i++){
        ((function(offset){
          setTimeout((function(){
            this.play(queue[offset]);
          }).bind(this), offset * calculated_bpm)
        }).bind(this))(i);
      }
    };

Source: [Synth.js](https://github.com/garvank/synth-js)


So I began investigating. I ended up simplifying down to:

    for(i=0; i < queue.length; i++)
       setTimeout( this.show.bind(this, el, queue[i]), delay * i );

Replaced play() with show() for my example. Main.js has the investigation diary (thought process) located after code.

Also, a working demo: [JSFiddle](https://jsfiddle.net/ryunp/8nyq969t/1/)
