// Nodal-only UI behaviors; keeps form.js and lootgen.js untouched.
$(function () {
  const clamp = (val, min, max) => Math.min(max, Math.max(min, val));

  const decimalsFromStep = (step) => {
    if (!Number.isFinite(step)) return 0;
    const parts = step.toString().split(".");
    return parts[1] ? parts[1].length : 0;
  };

  const formatValue = (val, step) => {
    const decimals = decimalsFromStep(step);
    if (decimals <= 0) return Math.round(val).toString();
    return Number(val).toFixed(decimals);
  };

  const inferBounds = ($input, value) => {
    const minAttr = parseFloat($input.attr("min"));
    const maxAttr = parseFloat($input.attr("max"));
    const span = Math.max(10, Math.abs(value) || 10);

    const min = Number.isFinite(minAttr) ? minAttr : Math.min(0, value - span);
    let max = Number.isFinite(maxAttr) ? maxAttr : Math.max(value + span, min + span);
    if (max <= min) max = min + span;

    return { min, max };
  };

  const bindFader = ($input) => {
    if ($input.data("fader-bound")) return;
    $input.data("fader-bound", true);

    const current = Number.isFinite(parseFloat($input.val())) ? parseFloat($input.val()) : 0;
    const bounds = inferBounds($input, current);
    const stepAttr = parseFloat($input.attr("step"));
    const step = Number.isFinite(stepAttr) ? stepAttr : Number.isInteger(current) ? 1 : 0.01;
    const initial = clamp(current, bounds.min, bounds.max);

    const $wrapper = $('<div class="fader"></div>');
    const $range = $('<input type="range" class="fader-range">').attr({
      min: bounds.min,
      max: bounds.max,
      step,
      value: initial
    });
    const $value = $('<div class="fader-value"></div>');

    const updateValue = (val) => {
      const clamped = clamp(val, bounds.min, bounds.max);
      $range.val(clamped);
      $value.text(formatValue(clamped, step));
    };

    $input
      .addClass("fader-number")
      .attr("aria-hidden", "true")
      .val(initial);

    $input.wrap($wrapper);
    const $container = $input.parent();
    $container.prepend($range);
    $container.append($value);
    updateValue(initial);

    $range.on("input", function () {
      const val = parseFloat(this.value);
      if (Number.isNaN(val)) return;
      $input.val(val);
      updateValue(val);
      $input.trigger("input");
    });

    $input.on("input.fader-sync", function () {
      const val = parseFloat($(this).val());
      if (Number.isNaN(val)) return;
      updateValue(val);
    });
  };

  // Wait a tick to let form.js populate defaults, then bind sliders.
  setTimeout(() => {
    $("#config-form input[type='number']")
      .not("[readonly]")
      .not("[disabled]")
      .each(function () {
        bindFader($(this));
      });
  }, 0);
});
