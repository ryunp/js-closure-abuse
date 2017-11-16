# js-closure-abuse
## An exploration into closures, execution scope, and Object.bind()

This [chunk of code](https://github.com/garvank/synth-js) looks incredibly complex and begs to be dissected.

```
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
```

If you are just looking for the end result, here is what became of the mess:

```
for(i=0; i < queue.length; i++)
   setTimeout(this.show.bind(this, el, queue[i]), delay * i);
```

Details explained below.

---

**Technical Review**

The breakdown below is split into multiple sections. Each section has three sub-sections
- title / intro
- setTimeout call stack review
- callback call stack review.

I've added a extra parameter to my function calls, but this does not interfere with the experiment.

---

### Original Code ([run_original()](js/main.js#L37-L48))

Let's break down the statements.

```
Test.prototype.run_original = function(el, queue, ms){

  var delay = ms;    

  for (i=0; i < queue.length; i++) {
    ((function(offset){                  // #1
      setTimeout((function(){            // #2
        this.show(el, queue[offset]);
      }).bind(this), offset * delay);
    }).bind(this))(i);
  }
};
```

The mentality here is:
- #1) Create closure around setTimeout with current index saved inside
- #2) Create closure and give to setTimeout as callback with saved index

Trying to save the index value gone wrong. Same with binding `this` contex. These are bound multiple times. The purpose of `Object.bind()` is to preserve `this` context *and* `arguments` for the executon of a functor.

From the [docs](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/bind):

> The bind() method creates a new function that, when called, has its this keyword set to the provided value, with a given sequence of arguments preceding any provided when the new function is called.

#### setTimeout Invocation Call Stack

![run_original setTimeout call stack](img/run_original_setTimeout.jpg)

We can see the function formed around setTimeout.

#### Callback Invocation Call Stack

![run_original callback call stack](img/run_original_callback.jpg)

Again we can see the function formed around the payload (Test.play) that was passed as the setTimeout argument.

The extra function around setTimeout seems completely unnecessary. We only need to bind context and arguments once. Let's remove the outer function...

---

### SetTimeout Closure Removal ([run_meh()](js/main.js#L52-L61))

After stripping the wrapping function, we get:

```
Test.prototype.run_meh = function(el, queue, ms) {

  var delay = ms;

  for (i=0; i < queue.length; i++) {
    setTimeout((function(item) {
      this.show(el, item);
    }).bind(this, queue[i]), delay * i);
  }
};
```

Still works just fine after simply removing the outer colsure IIFE, as saving a copy of the context and iteration value does us no good.

#### setTimeout Invocation Call Stack

![run_meh setTimeout call stack](img/run_meh_setTimeout.jpg)

Indeed the function wrapping setTimeout has been removed. Beautiful; less jumps for that poor CPU.

#### Callback Invocation Call Stack

![run_meh callback call stack](img/run_meh_callback.jpg)

We still require binding context and arguements for the callback invocation. As `Object.bind()`'s job is to create a function, explicitly binding a closure around a function is rhetorical. The next step would be stripping that down to just bind.

### Callback Closure Refactor ([run_cranked()](js/main.js#L65-L70))

Chop chop:

```
Test.prototype.run_cranked = function(el, queue, ms) {

  var delay = ms;

  for (i=0; i < queue.length; i++)
    setTimeout( this.show.bind(this, el, queue[i]), delay * i );
};
```

That looks more declarative and easier to read. Mmmm mmmm mmm, sexyness! 

#### setTimeout Invocation Call Stack

![run_cranked setTimeout call stack](img/run_cranked_setTimeout.jpg)

Nothing changed here, naturally.

#### Callback Invocation Call Stack

![run_cranked callback call stack](img/run_cranked_callback.jpg)

The anonymous function wrapper is gone, perfect! Bind did it's job to preserve the object reference and argument values! Yay!

---

### Conclusion

Poor JavaScript, always misunderstood. This was a bit tricky due to the need to reference a fellow method of it's object. Be careful creating extra layers of abstraction; make sure execution context is understood! Be as declarative as possible and exploit the first-class nature of JS!

As a final comparison:

```
for(i=0; i < queue.length; i++){
  ((function(offset){
    setTimeout((function(){
      this.play(queue[offset]);
    }).bind(this), offset * calculated_bpm)
  }).bind(this))(i);
}
```
```
for (i=0; i < queue.length; i++)
    setTimeout( this.show.bind(this, el, queue[i]), delay * i );
```

Yes.

### Performance

Extra closures take cycles to deal with as shown in the image below. May not seem like much, but at large scale these can consume much needed resources.

![combined setTimeout call stacks](img/all_setTimeout.jpg)

### Demo

Because, you know, science and stuff: [JSFiddle](https://jsfiddle.net/ryunp/8nyq969t/) or [Github](http://ryunp.github.io/js-closure-abuse/)

### #FriendsDontLetFriendsDoubleWrap

Any mistakes or flaws? Let me know!
