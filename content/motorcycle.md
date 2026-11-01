§ / Project

# Under the Engine: how a motorcycle actually works

*An interactive, open explorer for the parts of a petrol motorcycle and the cycle that drives it. Toggle between four-stroke and two-stroke, change the bore, stroke, compression and RPM, and watch the piston, valves, ports and spark do their work. Electric is next.*

<p class="article-meta"><span class="article-date">1 November 2026</span> · <span class="article-reading-time">3 min read</span></p>

<div class="strata-hero-actions" style="margin:1.2em 0; display:flex; flex-wrap:wrap; gap:10px;">
<a href="/motorcycle-anatomy" class="btn btn-ink">Launch Under the Engine &rarr;</a>
<a href="https://www.underthehood.online" class="btn btn-ghost" target="_blank" rel="noopener">The car tool that inspired this</a>
</div>

Most people who ride a motorcycle, including most people in the Lab's e-mobility fieldwork, have never seen the four-stroke cycle actually walked through. Petrol engines are described as magic that happens somewhere under the fuel tank; electric motors are described as magic of a different kind. Both are mechanisms you can draw, label and animate — and once you can, the differences between them become much easier to talk about.

**Under the Engine** is the first piece of that: an interactive, light-theme explorer of a petrol motorcycle. There is no sign-in, no account; everything runs in the browser.

## What is in version 0.1

- **Toggle four-stroke / two-stroke.** The same stage shows a different mechanism: a four-stroke has an intake and an exhaust valve in the head and takes two crank revolutions per cycle; a two-stroke uses ports in the cylinder wall and fires every revolution.
- **Animated cross-section.** Piston, connecting rod, crankshaft, cylinder, head, spark plug, valves (4T) or exhaust and transfer ports (2T). Gas colour in the cylinder follows the stroke: cool blue for the fresh charge, warm orange for combustion, grey for exhaust.
- **Timing strip.** A 720° (4T) or 360° (2T) strip at the bottom of the stage shows which stroke you are in and marks the current crank angle.
- **Parameters you can change.** RPM, bore, stroke, compression ratio. Displacement is recomputed live, with educational estimates of peak torque and power at the current RPM.
- **Exploded motorcycle.** A full side-view diagram with every major part labelled — frame, engine, carburetor or injector, air filter, fuel tank, exhaust, battery, forks, rear shock, swingarm, brakes, chain, sprockets, wheels, lights, instruments. Click a label to read what it does.

## What is coming

- **Electric mode.** The same stage, swapped: motor, controller, battery pack, throttle, BMS. A side-by-side comparison with the ICE drivetrain, so you can see which parts fall away and which new ones appear.
- **Save your own configurations.** Dial a 650 cc single or a 125 cc two-stroke and share the URL.
- **Richer sections.** Separate stages for the ignition system, the fuel system, and the transmission.

## Credits

The idea is adapted from the excellent [Under the Hood](https://www.underthehood.online) by @gristavo, which does this for a car. This version is a from-scratch build by the Lab, aimed at motorcycles and (soon) at electric drivetrains, as part of the Lab's wider work on [E-Mobility &amp; Transport](/expertise-e-mobility).

---

*See the Lab's field essays from Nairobi for how all of this plays out in a working fleet: [Four Hours at the Hub](/insight-four-hours-at-the-hub), [Hands Never Still](/insight-hands-never-still), [The Hidden Energy Economy](/insight-hidden-energy-economy). To discuss a study, see [Contact](/contact).*
